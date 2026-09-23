import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: unknown = null,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const messages: Record<number, string> = {
  0: "Не удалось связаться с сервисом. Проверьте подключение и повторите попытку.",
  401: "Сессия завершена. Войдите снова.",
  403: "Недостаточно прав для этого действия.",
  404: "Объект не найден или недоступен.",
  409: "Данные изменились или действие уже выполнено. Обновите страницу.",
  413: "Файл превышает допустимый размер 5 МиБ.",
  422: "Проверьте введённые данные.",
  429: "Слишком много запросов. Попробуйте немного позже.",
  500: "Ошибка сервиса. Попробуйте позже.",
  502: "ИИ вернул некорректный ответ. Повторите анализ.",
  503: "Сервис временно недоступен / требуется настройка.",
  504: "ИИ не ответил вовремя. Повторите анализ.",
};
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "profile_required") return "Завершите создание профиля.";
    if (error.code === "stale_analysis")
      return "Заявка была изменена. Выполните анализ повторно.";
    return error.message;
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function parseError(status: number, body: unknown, requestId?: string) {
  const envelope = record(body) ? body : {};
  const info = record(envelope.error) ? envelope.error : {};
  const code = typeof info.code === "string" ? info.code : "http_error";
  const raw = typeof info.message === "string" ? info.message : "";
  // Only bounded client errors from the documented envelope; never display provider/stack output.
  const safeMessage =
    status < 500 &&
    raw.length <= 700 &&
    !/traceback|stack trace|bearer |api[_-]?key|<html/i.test(raw)
      ? raw
      : "";
  return new ApiError(
    status,
    code,
    safeMessage || messages[status] || "Ошибка запроса.",
    info.details,
    typeof envelope.request_id === "string" ? envelope.request_id : requestId,
  );
}
export interface TokenProvider {
  token: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
  onUnauthorized?: () => void;
  onProfileRequired?: () => void;
}
export type Query = Record<string, string | number | boolean | undefined>;
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export function createApiClient(
  auth: TokenProvider,
  fetcher: typeof fetch = fetch,
  base = env.apiBase,
) {
  return async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(base + path);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "")
        url.searchParams.set(key, String(value));
    });
    let token = await auth.token();
    if (!token) {
      auth.onUnauthorized?.();
      throw new ApiError(401, "authentication_required", messages[401]);
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 60000,
      );
      const abort = () => controller.abort();
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) controller.abort();
      const multipart = options.body instanceof FormData;
      try {
        const response = await fetcher(url, {
          method: options.method || "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body !== undefined && !multipart
              ? { "Content-Type": "application/json" }
              : {}),
          },
          body:
            options.body === undefined
              ? undefined
              : multipart
                ? (options.body as FormData)
                : JSON.stringify(options.body),
          signal: controller.signal,
        });
        if (response.status === 401 && attempt === 0) {
          try {
            token = await auth.refresh();
          } catch {
            token = null;
          }
          if (token) continue;
        }
        const raw = await response.text();
        let body: unknown;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          if (response.ok)
            throw new ApiError(
              response.status,
              "invalid_response",
              "Сервис вернул ответ в неожиданном формате.",
              null,
              response.headers.get("X-Request-ID") || undefined,
            );
        }
        if (!response.ok) {
          const error = parseError(
            response.status,
            body,
            response.headers.get("X-Request-ID") || undefined,
          );
          if (error.status === 401) auth.onUnauthorized?.();
          if (error.code === "profile_required") auth.onProfileRequired?.();
          throw error;
        }
        return body as T;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (options.signal?.aborted) throw error;
        throw new ApiError(
          0,
          controller.signal.aborted ? "timeout" : "network_error",
          controller.signal.aborted
            ? "Время ожидания истекло. Проверьте состояние операции перед повтором."
            : messages[0],
        );
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
      }
    }
    throw new ApiError(401, "authentication_required", messages[401]);
  };
}
export const api = createApiClient({
  token: async () => {
    const { browserAuth } = await import("@/auth/browser");
    return (
      (await browserAuth().auth.getSession()).data.session?.access_token || null
    );
  },
  refresh: async () => {
    const { browserAuth } = await import("@/auth/browser");
    return (
      (await browserAuth().auth.refreshSession()).data.session?.access_token ||
      null
    );
  },
  onUnauthorized: () => {
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("api:navigate", {
          detail:
            "/login?next=" +
            encodeURIComponent(
              window.location.pathname + window.location.search,
            ),
        }),
      );
  },
  onProfileRequired: () => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/complete-profile"
    )
      window.dispatchEvent(
        new CustomEvent("api:navigate", {
          detail:
            "/complete-profile?next=" +
            encodeURIComponent(window.location.pathname),
        }),
      );
  },
});
