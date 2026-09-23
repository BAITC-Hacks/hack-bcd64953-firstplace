import { test, expect, type Page } from "@playwright/test";
const fixture = "http://localhost:8011";
const project = "00000000-0000-4000-8000-000000000010";
const csv =
  "member_name,email,university,skills,experience_years,portfolio_url\nAlia,alia@example.test,University,Python;SQL,2,https://example.com\n";
async function login(
  page: Page,
  role = "student",
  next = "/student/applications",
) {
  await page.goto("/login?next=" + encodeURIComponent(next));
  await page.getByLabel("Электронная почта").fill(role + "@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === next);
}
async function upload(page: Page) {
  await page.goto("/student/applications/" + project + "/apply");
  await page
    .getByLabel("Выберите файл команды")
    .setInputFiles({
      name: "team.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await page.getByRole("button", { name: "Загрузить и проверить CSV" }).click();
  await expect(
    page.getByRole("heading", { name: "CSV прошёл проверку" }),
  ).toBeVisible();
}
test.beforeEach(async ({ request }) => {
  await request.post(fixture + "/__control", { data: { reset: true } });
});
test("public pages and 390 / 768 / 1440 layouts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Превращаем бизнес-идеи",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/home-" + width + ".png",
      fullPage: true,
    });
  }
  for (const route of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/about",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1").last()).toBeVisible();
  }
  await page.goto("/business/applications/" + project + "/preview");
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});
test("registration, recovery and backend onboarding", async ({ page }) => {
  await page.goto("/register?next=/business/applications/create");
  await page.getByLabel("Электронная почта").fill("new@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "Проверьте почту",
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Электронная почта").fill("new@example.test");
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(page.locator(".notice[role=status]")).toContainText("письмо");
  await page.goto("/login?next=/business/applications/create");
  await page.getByLabel("Электронная почта").fill("onboarding@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/complete-profile/);
  await page.getByLabel("Бизнес", { exact: true }).check();
  await page.getByLabel("Ваше имя").fill("Новый бизнес");
  await page.getByLabel("Название организации").fill("Новая компания");
  await page.getByRole("button", { name: "Создать профиль" }).click();
  await expect(page).toHaveURL(/business\/applications\/create/);
});
test("business draft → AI answers → 100% → publish → student response → accept", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "business", "/business/applications/create");
  await page
    .getByLabel("Описание задачи")
    .fill(
      "Нужно сократить время ручного анализа обращений клиентов и подготовить понятный отчёт.",
    );
  await page
    .getByRole("button", { name: "Создать черновик и продолжить" })
    .click();
  await page.getByRole("button", { name: "Запустить ИИ-анализ" }).click();
  await expect(
    page.getByRole("heading", { name: "Вопросы к вам" }),
  ).toBeVisible();
  const answers: Record<string, string> = {
    title: "Новый проект анализа",
    goal: "Сократить ручную работу",
    target_audience: "Команда поддержки",
    expected_result: "Прототип и отчёт",
    timeline: "6 недель",
    available_data: "Обезличенные обращения",
    success_criteria: "Точность выше 85%",
    required_skills: "Python; SQL",
  };
  for (const [field, value] of Object.entries(answers))
    await page
      .getByRole("textbox", {
        name: new RegExp("Уточните раздел: " + field + "$"),
      })
      .fill(value);
  await page.getByRole("button", { name: "Сохранить ответы" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Перейти к предпросмотру" }).click();
  await page.getByRole("button", { name: "Опубликовать заявку" }).click();
  await expect(page.getByText("Опубликована", { exact: true })).toBeVisible();
  await login(page, "student", "/student/applications");
  await page.getByLabel("Поиск по названию").fill("Новый проект");
  await page.getByLabel("Точный навык").fill("Python");
  await page.getByRole("button", { name: "Найти", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Новый проект анализа" }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Новый проект анализа" })
    .getByRole("link")
    .click();
  await page.getByRole("link", { name: "Подать заявку" }).click();
  await page
    .getByLabel("Выберите файл команды")
    .setInputFiles({
      name: "team.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await page.getByRole("button", { name: "Загрузить и проверить CSV" }).click();
  await expect(
    page.getByRole("heading", { name: "CSV прошёл проверку" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Проверить соответствие" }).click();
  await expect(page.getByText("Порог пройден", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Отправить отклик", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Сообщение для бизнеса").fill("Готовы обсудить проект");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Отправить отклик", exact: true })
    .click();
  await expect(
    page.getByText("На рассмотрении", { exact: true }),
  ).toBeVisible();
  await login(page, "business", "/business/responses");
  await page.getByRole("button", { name: "Принять", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить" }).click();
  await expect(page.getByText("Принята", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Состав команды" }).click();
  await expect(page.getByRole("heading", { name: "Алия Тест" })).toBeVisible();
  await page.goto("/business/notifications");
  await page.getByRole("button", { name: "Прочитано" }).click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "прочитанным",
  );
  const snapshot = await request
    .get(fixture + "/__state")
    .then((r) => r.json());
  expect(snapshot.responses[0].status).toBe("accepted");
  const submit = snapshot.calls.find(
    (call: { method: string; path: string }) =>
      call.method === "POST" && call.path.endsWith("/responses"),
  );
  expect(Object.keys(submit.body).sort()).toEqual(["message", "upload_id"]);
  const decision = snapshot.calls.find((call: { path: string }) =>
    call.path.endsWith("/decision"),
  );
  expect(decision.body).toEqual({ status: "accepted" });
  expect(errors).toEqual([]);
});
test("manual edit invalidates AI and 409 provides re-analysis", async ({
  page,
  request,
}) => {
  await login(page, "business", "/business/applications/create");
  await page
    .getByLabel("Описание задачи")
    .fill(
      "Нужно подготовить анализ обращений клиентов и улучшить процесс поддержки.",
    );
  await page
    .getByRole("button", { name: "Создать черновик и продолжить" })
    .click();
  await page.getByRole("button", { name: "Запустить ИИ-анализ" }).click();
  await page
    .getByRole("textbox", { name: /Уточните раздел: title$/ })
    .fill("Новая задача");
  await request.post(fixture + "/__control", { data: { forceStale: true } });
  await page.getByRole("button", { name: "Сохранить ответы" }).click();
  await expect(page.locator(".notice[role=alert]")).toContainText(
    "Заявка была изменена. Выполните анализ повторно.",
  );
  await page.getByRole("button", { name: "Повторить анализ" }).click();
  await expect(
    page.getByRole("heading", { name: "Вопросы к вам" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Редактировать поля" }).click();
  await page.getByLabel("Название", { exact: true }).fill("Обновлённая заявка");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(
    page.getByText("Заявка была изменена. Выполните анализ повторно."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Вопросы к вам" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Предпросмотр", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Опубликовать заявку" }),
  ).toBeDisabled();
});
test("CSV errors, ineligibility and stale matching remain recoverable", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/student/applications/" + project + "/apply");
  await page
    .getByLabel("Выберите файл команды")
    .setInputFiles({
      name: "wrong.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("x"),
    });
  await expect(page.locator(".notice[role=alert]")).toContainText(".csv");
  await expect(
    page.getByRole("button", { name: "Загрузить и проверить CSV" }),
  ).toBeDisabled();
  for (const status of [413, 422]) {
    await request.post(fixture + "/__control", {
      data: {
        fail: {
          path: "/csv",
          status,
          message:
            status === 413
              ? "CSV превышает 5 МиБ."
              : "Некорректные строки CSV.",
          once: true,
        },
      },
    });
    await page
      .getByLabel("Выберите файл команды")
      .setInputFiles({
        name: "team.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
      });
    await page
      .getByRole("button", { name: "Загрузить и проверить CSV" })
      .click();
    await expect(page.locator(".notice[role=alert]")).toBeVisible();
  }
  await upload(page);
  await request.post(fixture + "/__control", { data: { ineligible: true } });
  await page.getByRole("button", { name: "Проверить соответствие" }).click();
  await expect(page.getByText("Ниже порога", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Отправить отклик", exact: true }),
  ).toHaveCount(0);
  await request.post(fixture + "/__control", { data: { ineligible: false } });
  await page.getByRole("button", { name: "Проверить повторно" }).click();
  await page.getByRole("checkbox").check();
  await request.post(fixture + "/__control", {
    data: {
      fail: {
        path: "/responses",
        status: 422,
        message: "Соответствие ниже порога отправки.",
        once: true,
      },
    },
  });
  await page
    .getByRole("button", { name: "Отправить отклик", exact: true })
    .click();
  await expect(page.locator(".notice[role=alert]")).toContainText(
    "Соответствие ниже порога",
  );
  await expect(
    page.getByRole("button", { name: "Отправить отклик", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Проверить повторно" }),
  ).toBeVisible();
});
test("AI service failures 502/503/504 and offline backend", async ({
  page,
  request,
}) => {
  await login(page, "business", "/business/applications/create");
  await page
    .getByLabel("Описание задачи")
    .fill(
      "Необходимо улучшить обработку обращений и сократить время подготовки отчёта.",
    );
  await page
    .getByRole("button", { name: "Создать черновик и продолжить" })
    .click();
  for (const status of [502, 503, 504]) {
    await request.post(fixture + "/__control", {
      data: { fail: { path: "/analyze", status, once: true } },
    });
    await page.getByRole("button", { name: "Запустить ИИ-анализ" }).click();
    await expect(page.locator(".notice[role=alert]")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Вопросы к вам" }),
    ).toHaveCount(0);
  }
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/business/applications");
  await expect(page.locator(".notice[role=alert]")).toContainText(
    "Не удалось связаться",
  );
});
test("backend role overrides requested role and authenticated mobile navigation", async ({
  page,
}) => {
  await login(page, "student", "/student/applications");
  await page.goto("/business/dashboard");
  await expect(page).toHaveURL(/student\/dashboard/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/student/applications");
    await expect(
      page.getByRole("heading", { name: "Найдите свой следующий проект" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/catalog-" + width + ".png",
      fullPage: true,
    });
    if (width < 900) {
      await page.getByRole("button", { name: "Открыть меню" }).click();
      await expect(
        page.getByRole("navigation", { name: "Основная навигация" }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Профиль", exact: true }).click();
      await expect(page).toHaveURL(/student\/profile/);
    }
  }
});
