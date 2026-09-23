import { describe, it, expect, vi } from "vitest";
import {
  ApiError,
  createApiClient,
  errorText,
  parseError,
} from "../src/api/client";
import { csvPrecheck, MAX_CSV_BYTES } from "../src/validators/csv";
import {
  safePath,
  roleDestination,
  httpUrl,
} from "../src/validators/navigation";
const base = "http://localhost:8000/api/v1";
function auth() {
  return {
    token: vi.fn(async () => "initial-token"),
    refresh: vi.fn(async () => "refreshed-token"),
    onUnauthorized: vi.fn(),
    onProfileRequired: vi.fn(),
  };
}
describe("typed fetch boundary", () => {
  it("uses a single base and exact query names with Bearer token", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ items: [], total: 0, limit: 12, offset: 0 }),
      );
    const request = createApiClient(auth(), fetcher, base);
    await request("/applications", {
      query: {
        search: "NLP & AI",
        skill: "Python",
        sort: "newest",
        limit: 12,
        offset: 0,
      },
    });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe(
      base +
        "/applications?search=NLP+%26+AI&skill=Python&sort=newest&limit=12&offset=0",
    );
    expect(init?.headers).toEqual({ Authorization: "Bearer initial-token" });
  });
  it("refreshes once on 401 and retries with the refreshed token", async () => {
    const provider = auth();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ id: "ok" }));
    await expect(
      createApiClient(provider, fetcher, base)("/profile"),
    ).resolves.toEqual({ id: "ok" });
    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[1][1]?.headers).toEqual({
      Authorization: "Bearer refreshed-token",
    });
  });
  it("never loops on repeated 401", async () => {
    const provider = auth();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({}, { status: 401 }));
    await expect(
      createApiClient(provider, fetcher, base)("/profile"),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(provider.onUnauthorized).toHaveBeenCalledTimes(1);
  });
  it("requires login if session refresh fails", async () => {
    const provider = auth();
    provider.refresh.mockRejectedValue(new Error("offline"));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({}, { status: 401 }));
    await expect(
      createApiClient(provider, fetcher, base)("/profile"),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(provider.onUnauthorized).toHaveBeenCalledTimes(1);
  });
  it("routes profile_required to onboarding and preserves request id/details", async () => {
    const provider = auth();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          {
            error: {
              code: "profile_required",
              message: "Требуется профиль.",
              details: { field: "profile" },
            },
            request_id: "req-body",
          },
          { status: 403, headers: { "X-Request-ID": "req-header" } },
        ),
      );
    await expect(
      createApiClient(provider, fetcher, base)("/profile"),
    ).rejects.toMatchObject({
      code: "profile_required",
      requestId: "req-body",
      details: { field: "profile" },
    });
    expect(provider.onProfileRequired).toHaveBeenCalledOnce();
  });
  it("passes multipart file without Content-Type", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "upload" }));
    const body = new FormData();
    body.set("file", new Blob(["CSV"]), "team.csv");
    await createApiClient(
      auth(),
      fetcher,
      base,
    )("/applications/id/csv", { method: "POST", body });
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({
      Authorization: "Bearer initial-token",
    });
    expect(fetcher.mock.calls[0][1]?.body).toBe(body);
  });
  it("preserves exact answer IDs and does not retry 409", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: { code: "conflict", message: "Stale" } },
          { status: 409 },
        ),
      );
    await expect(
      createApiClient(
        auth(),
        fetcher,
        base,
      )("/applications/id/answers", {
        method: "POST",
        body: { answers: [{ question_id: "server-uuid", answer: "6 недель" }] },
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      answers: [{ question_id: "server-uuid", answer: "6 недель" }],
    });
  });
  it("handles non-JSON success without treating it as data", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("<html>proxy</html>", {
          headers: { "X-Request-ID": "req" },
        }),
      );
    await expect(
      createApiClient(auth(), fetcher, base)("/profile"),
    ).rejects.toMatchObject({ code: "invalid_response", requestId: "req" });
  });
  it("handles offline service without repeating a mutation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      createApiClient(
        auth(),
        fetcher,
        base,
      )("/applications", { method: "POST", body: { description: "hello" } }),
    ).rejects.toMatchObject({ code: "network_error", status: 0 });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("aborts a timed out request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      );
    await expect(
      createApiClient(auth(), fetcher, base)("/profile", { timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: "timeout" });
  });
  it.each([403, 404, 409, 413, 422, 429, 500, 502, 503, 504])(
    "handles HTTP %s and non-JSON errors safely",
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response("private stack trace", {
            status,
            headers: { "X-Request-ID": "req-123" },
          }),
        );
      await expect(
        createApiClient(auth(), fetcher, base)("/profile"),
      ).rejects.toMatchObject({ status, requestId: "req-123" });
    },
  );
  it("does not expose unsafe backend error messages", () => {
    expect(
      parseError(500, { error: { message: "secret provider key" } }).message,
    ).not.toContain("secret");
    expect(
      parseError(422, { error: { message: "Traceback api_key=secret" } })
        .message,
    ).not.toContain("secret");
    expect(errorText(new Error("private"))).not.toContain("private");
  });
  it("shows the stale-analysis recovery message", () =>
    expect(errorText(new ApiError(409, "stale_analysis", "stale"))).toBe(
      "Заявка была изменена. Выполните анализ повторно.",
    ));
});
describe("UX validation and redirects", () => {
  it("only prechecks CSV extension and size; accepts BOM-ready file contents without parsing", () => {
    expect(csvPrecheck({ name: "team.CSV", size: MAX_CSV_BYTES })).toBeNull();
    expect(
      csvPrecheck({ name: "team.csv", size: MAX_CSV_BYTES + 1 }),
    ).toContain("5");
    expect(csvPrecheck({ name: "team.xlsx", size: 100 })).toContain(".csv");
    expect(csvPrecheck({ name: "team.csv", size: 0 })).toContain("пуст");
  });
  it("rejects unsafe next destinations and keeps backend role authoritative", () => {
    for (const target of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/x\r\n",
    ])
      expect(safePath(target)).toBe("/complete-profile");
    expect(roleDestination("student", "/business/dashboard")).toBe(
      "/student/dashboard",
    );
    expect(roleDestination("business", "/business/applications/create")).toBe(
      "/business/applications/create",
    );
  });
  it("only renders HTTP/HTTPS portfolio links", () => {
    expect(httpUrl("javascript:alert(1)")).toBeUndefined();
    expect(httpUrl("https://example.com")).toBe("https://example.com/");
  });
});
