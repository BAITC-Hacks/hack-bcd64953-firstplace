// Test-only contract fixtures. Never imported by the application.
import http from "node:http";
import { createHmac } from "node:crypto";
const origin = "http://localhost:8011";
const uuid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const stamp = "2026-09-23T10:00:00Z";
const businessId = uuid(2),
  studentId = uuid(3);
const members = [
  {
    member_name: "Алия Тест",
    email: "alia@example.test",
    university: "Тестовый университет",
    skills: ["Python", "SQL"],
    experience_years: 2,
    portfolio_url: "https://example.com",
  },
];
const student = {
  team_name: "Команда Орбита",
  university: "Тестовый университет",
  skills: ["Python", "SQL"],
  experience: "Учебные проекты",
  portfolio_url: "https://example.com",
};
const business = {
  organization_name: "Sana Lab",
  description: "Тестовая организация",
  contacts: "business@example.test",
};
const complete = {
  title: "Анализ обращений клиентов",
  description:
    "Нужен прототип для анализа тем обращений клиентов и отчёт для команды поддержки.",
  goal: "Сократить ручную работу",
  target_audience: "Поддержка",
  expected_result: "Прототип и отчёт",
  timeline: "6 недель",
  available_data: "Обезличенные обращения",
  success_criteria: "Точность выше 85%",
  required_skills: ["Python", "SQL"],
  min_experience_years: 1,
};
let state;
function reset() {
  state = {
    apps: [
      {
        ...complete,
        id: uuid(10),
        business_id: businessId,
        organization_name: "Sana Lab",
        status: "published",
        revision: 1,
        readiness_score: 100,
        created_at: stamp,
        updated_at: stamp,
      },
    ],
    analyses: {},
    uploads: {},
    matches: {},
    responses: [],
    notifications: [],
    profiles: {},
    counter: 20,
    fail: null,
    forceStale: false,
    ineligible: false,
    calls: [],
  };
}
reset();
function user(email) {
  return {
    id: email.startsWith("business")
      ? uuid(102)
      : email.startsWith("onboarding")
        ? uuid(104)
        : uuid(103),
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: stamp,
    created_at: stamp,
    updated_at: stamp,
    app_metadata: { provider: "email" },
    user_metadata: {},
  };
}
function session(email) {
  const u = user(email);
  const head = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: u.id,
      email,
      iss: origin + "/auth/v1",
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString("base64url");
  const token =
    head +
    "." +
    body +
    "." +
    createHmac("sha256", "contract-fixture-only")
      .update(head + "." + body)
      .digest("base64url");
  return {
    access_token: token,
    refresh_token: "fixture-refresh-" + email,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: u,
  };
}
function emailOf(req) {
  try {
    return JSON.parse(
      Buffer.from(
        (req.headers.authorization || "").split(".")[1],
        "base64url",
      ).toString(),
    ).email;
  } catch {
    return "";
  }
}
function profile(email) {
  if (state.profiles[email]) return state.profiles[email];
  if (email.startsWith("onboarding")) return null;
  const role = email.startsWith("business") ? "business" : "student";
  return {
    id: role === "business" ? businessId : studentId,
    user_id: user(email).id,
    role,
    display_name: role === "business" ? "Айдана" : "Алия",
    email,
    avatar_url: null,
    business: role === "business" ? business : null,
    student: role === "student" ? student : null,
    created_at: stamp,
    updated_at: stamp,
  };
}
function readiness(a) {
  const weights = {
    title: 5,
    description: 10,
    goal: 15,
    target_audience: 10,
    expected_result: 15,
    timeline: 10,
    available_data: 10,
    success_criteria: 15,
    required_skills: 10,
  };
  const filled = Object.keys(weights).filter((key) =>
    Array.isArray(a[key]) ? a[key].length > 0 : Boolean(a[key]),
  );
  return {
    score: filled.reduce((sum, key) => sum + weights[key], 0),
    filled_fields: filled,
    missing_fields: Object.keys(weights).filter((key) => !filled.includes(key)),
  };
}
function paged(items, url) {
  const limit = Number(url.searchParams.get("limit") || 20),
    offset = Number(url.searchParams.get("offset") || 0);
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3100");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,content-type,x-client-info,apikey,x-supabase-api-version",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "X-Request-ID");
  res.setHeader("X-Request-ID", "fixture-request-id");
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  const error = (status, code, message) =>
    send(status, {
      error: { code, message, details: null },
      request_id: "fixture-request-id",
    });
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  const url = new URL(req.url, origin);
  const pathname = url.pathname;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body = {};
  if (req.headers["content-type"]?.includes("application/json")) {
    try {
      body = JSON.parse(raw);
    } catch {
      return error(422, "invalid_json", "Некорректный JSON");
    }
  }
  if (pathname === "/__health") return send(200, { fixture: true });
  if (pathname === "/__control") {
    if (body.reset) reset();
    for (const key of ["fail", "forceStale", "ineligible"])
      if (body[key] !== undefined) state[key] = body[key];
    return send(200, { ok: true });
  }
  if (pathname === "/__state")
    return send(200, {
      apps: state.apps,
      responses: state.responses,
      calls: state.calls,
    });
  if (pathname === "/auth/v1/token")
    return send(
      200,
      session(
        body.email ||
          String(body.refresh_token).replace("fixture-refresh-", ""),
      ),
    );
  if (pathname === "/auth/v1/signup") return send(200, user(body.email));
  if (pathname === "/auth/v1/recover" || pathname === "/auth/v1/logout")
    return send(200, {});
  if (pathname === "/auth/v1/user")
    return send(200, user(emailOf(req) || "student@example.test"));
  if (pathname === "/auth/v1/.well-known/jwks.json")
    return send(200, { keys: [] });
  if (!pathname.startsWith("/api/v1"))
    return error(404, "not_found", "Не найдено");
  const route = pathname.slice(7),
    email = emailOf(req);
  if (!email) return error(401, "authentication_required", "Требуется вход.");
  const p = profile(email);
  state.calls.push({
    method: req.method,
    path: route,
    body: req.headers["content-type"]?.includes("application/json")
      ? body
      : null,
    contentType: req.headers["content-type"],
  });
  if (state.fail && route.includes(state.fail.path)) {
    const failure = state.fail;
    if (failure.once) state.fail = null;
    return error(
      failure.status,
      failure.code || "fixture_error",
      failure.message || "Ошибка тестового сервиса.",
    );
  }
  if (route === "/profile" && req.method === "PUT") {
    const saved = {
      ...(p || {
        id: uuid(4),
        user_id: user(email).id,
        email,
        avatar_url: null,
        created_at: stamp,
        updated_at: stamp,
        business: null,
        student: null,
      }),
      ...body,
    };
    if (p && body.role && p.role !== body.role)
      return error(409, "role_immutable", "Роль изменить нельзя.");
    state.profiles[email] = saved;
    return send(200, saved);
  }
  if (!p) return error(403, "profile_required", "Требуется профиль.");
  if (route === "/profile") return send(200, p);
  if (route.startsWith("/business") && p.role !== "business")
    return error(403, "wrong_role", "Нужна роль бизнеса.");
  if (route.startsWith("/student") && p.role !== "student")
    return error(403, "wrong_role", "Нужна роль студента.");
  if (
    (route === "/applications" || route === "/business/applications") &&
    req.method === "GET"
  ) {
    if (route === "/applications" && p.role !== "student")
      return error(403, "wrong_role", "Нужна роль студента.");
    let items = state.apps.filter((a) =>
      route === "/applications"
        ? a.status === "published"
        : a.business_id === p.id,
    );
    const search = url.searchParams.get("search"),
      skill = url.searchParams.get("skill"),
      status = url.searchParams.get("status");
    if (search)
      items = items.filter((a) =>
        a.title.toLowerCase().includes(search.toLowerCase()),
      );
    if (skill) items = items.filter((a) => a.required_skills.includes(skill));
    if (status) items = items.filter((a) => a.status === status);
    if (url.searchParams.get("sort") !== "oldest") items = [...items].reverse();
    return send(200, paged(items, url));
  }
  if (route === "/applications" && req.method === "POST") {
    const a = {
      title: "",
      goal: "",
      target_audience: "",
      expected_result: "",
      timeline: "",
      available_data: "",
      success_criteria: "",
      required_skills: [],
      min_experience_years: 0,
      ...body,
      id: uuid(state.counter++),
      business_id: p.id,
      organization_name: business.organization_name,
      status: "draft",
      revision: 1,
      readiness_score: 10,
      created_at: stamp,
      updated_at: stamp,
    };
    state.apps.push(a);
    return send(201, a);
  }
  let match = route.match(/^\/applications\/([^/]+)(.*)$/);
  if (match) {
    const id = match[1],
      suffix = match[2],
      a = state.apps.find((a) => a.id === id);
    if (!a) return error(404, "not_found", "Заявка не найдена.");
    if (!suffix && req.method === "GET") return send(200, a);
    if (!suffix && req.method === "PATCH") {
      Object.assign(a, body);
      a.revision++;
      a.readiness_score = readiness(a).score;
      return send(200, a);
    }
    if (suffix === "/analysis") {
      if (!state.analyses[id])
        return error(404, "not_found", "Анализ не найден.");
      return send(200, state.analyses[id]);
    }
    if (suffix === "/analyze") {
      const r = readiness(a);
      const analysis = {
        id: uuid(state.counter++),
        application_id: id,
        application_revision: a.revision,
        summary: "Уточните цели, результат и доступные данные проекта.",
        recommendations: ["Опишите проверяемый результат."],
        questions: r.missing_fields
          .filter((f) => f !== "description")
          .map((field, index) => ({
            id: uuid(200 + index),
            field,
            question: "Уточните раздел: " + field,
            answer: null,
          })),
        readiness: r,
        created_at: stamp,
      };
      state.analyses[id] = analysis;
      return send(200, analysis);
    }
    if (suffix === "/answers") {
      const analysis = state.analyses[id];
      if (
        state.forceStale ||
        !analysis ||
        analysis.application_revision !== a.revision
      ) {
        state.forceStale = false;
        return error(409, "conflict", "Анализ устарел.");
      }
      for (const answer of body.answers) {
        const q = analysis.questions.find((q) => q.id === answer.question_id);
        if (!q) return error(422, "invalid_question", "Вопрос не найден.");
        q.answer = answer.answer;
        a[q.field] =
          q.field === "required_skills"
            ? answer.answer.split(/[;,]/).map((s) => s.trim())
            : answer.answer;
      }
      a.revision++;
      a.readiness_score = readiness(a).score;
      return send(200, a);
    }
    if (suffix === "/publish") {
      if (a.readiness_score !== 100)
        return error(422, "not_ready", "Готовность должна быть 100%.");
      a.status = "published";
      return send(200, a);
    }
    if (suffix === "/close") {
      a.status = "closed";
      return send(200, a);
    }
    if (suffix === "/csv") {
      if (
        !req.headers["content-type"]?.includes("multipart/form-data; boundary=")
      )
        return error(422, "invalid_multipart", "Нужен multipart.");
      const upload = {
        id: uuid(state.counter++),
        application_id: id,
        student_id: p.id,
        filename: raw.match(/filename="([^"]+)"/)?.[1] || "team.csv",
        members,
        created_at: stamp,
      };
      state.uploads[upload.id] = upload;
      return send(201, upload);
    }
    const csvPath = suffix.match(/^\/csv\/([^/]+)(.*)$/);
    if (csvPath) {
      const upload = state.uploads[csvPath[1]];
      if (!upload) return error(404, "not_found", "Загрузка не найдена.");
      if (!csvPath[2]) return send(200, upload);
      if (csvPath[2] === "/analysis") {
        const result = state.matches[upload.id];
        return result
          ? send(200, result)
          : error(404, "not_found", "Оценка не найдена.");
      }
      if (csvPath[2] === "/analyze") {
        const result = {
          id: uuid(state.counter++),
          upload_id: upload.id,
          application_id: id,
          student_id: p.id,
          application_revision: a.revision,
          score: state.ineligible ? 70 : 95,
          eligible: !state.ineligible,
          threshold: 90,
          matched_skills: ["Python"],
          missing_skills: state.ineligible ? ["SQL"] : [],
          experience_score: 15,
          explanation: "Оценка тестового сервиса по навыкам и опыту.",
          created_at: stamp,
        };
        state.matches[upload.id] = result;
        return send(200, result);
      }
    }
    if (suffix === "/responses" && req.method === "POST") {
      const evaluation = state.matches[body.upload_id];
      if (!evaluation?.eligible)
        return error(
          422,
          "match_below_threshold",
          "Соответствие ниже порога отправки.",
        );
      if (
        state.responses.some(
          (r) => r.application_id === id && r.student_id === p.id,
        )
      )
        return error(409, "duplicate", "Отклик уже отправлен.");
      const response = {
        id: uuid(state.counter++),
        application_id: id,
        student_id: p.id,
        upload_id: body.upload_id,
        evaluation_id: evaluation.id,
        status: "pending",
        message: body.message,
        decided_at: null,
        created_at: stamp,
        updated_at: stamp,
        team: {
          id: p.id,
          display_name: p.display_name,
          student: p.student,
          members,
        },
        evaluation,
      };
      state.responses.push(response);
      state.notifications.push({
        id: uuid(state.counter++),
        profile_id: businessId,
        title: "Новый отклик",
        body: "Команда откликнулась на вашу заявку.",
        link: "/business/applications/" + id + "/responses",
        is_read: false,
        created_at: stamp,
      });
      return send(201, response);
    }
    if (suffix === "/responses")
      return send(
        200,
        paged(
          state.responses.filter((r) => r.application_id === id),
          url,
        ),
      );
  }
  if (route === "/business/responses" || route === "/student/responses")
    return send(
      200,
      paged(
        state.responses.filter(
          (r) => p.role === "business" || r.student_id === p.id,
        ),
        url,
      ),
    );
  match = route.match(/^\/responses\/([^/]+)(.*)$/);
  if (match) {
    const r = state.responses.find((r) => r.id === match[1]);
    if (!r) return error(404, "not_found", "Отклик не найден.");
    if (match[2] === "/decision") {
      if (Object.keys(body).join(",") !== "status")
        return error(422, "invalid_body", "Только status.");
      if (r.status !== "pending" && r.status !== body.status)
        return error(409, "conflict", "Решение уже принято.");
      r.status = body.status;
      r.decided_at = stamp;
      state.notifications.push({
        id: uuid(state.counter++),
        profile_id: studentId,
        title: "Решение по отклику",
        body: "Ваш отклик рассмотрен.",
        link: "/student/responses/" + r.id,
        is_read: false,
        created_at: stamp,
      });
    }
    return send(200, r);
  }
  if (route.startsWith("/business/teams/")) {
    const r = state.responses.find(
      (r) => r.team.id === route.split("/").at(-1),
    );
    return r
      ? send(200, r.team)
      : error(404, "not_found", "Команда не найдена.");
  }
  if (route === "/notifications") {
    let items = state.notifications.filter((n) => n.profile_id === p.id);
    if (url.searchParams.get("unread_only") === "true")
      items = items.filter((n) => !n.is_read);
    return send(200, paged(items, url));
  }
  if (route.startsWith("/notifications/")) {
    const n = state.notifications.find((n) => n.id === route.split("/").at(-1));
    if (!n) return error(404, "not_found", "Не найдено.");
    n.is_read = true;
    return send(200, n);
  }
  return error(404, "not_found", "Маршрут тестового сервиса не найден.");
});
server.listen(8011, "localhost", () =>
  console.log("Contract fixture listening on " + origin),
);
