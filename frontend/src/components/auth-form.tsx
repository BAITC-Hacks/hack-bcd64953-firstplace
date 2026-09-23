"use client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "./brand";
import { Button, ErrorNotice, Success } from "./ui";
import { browserAuth } from "@/auth/browser";
import { authConfigured } from "@/config/env";
import { ApiError } from "@/api/client";
import { profiles } from "@/api/profiles";
import { useAction } from "@/hooks/use-resource";
import { roleDestination, safePath } from "@/validators/navigation";
export type AuthMode = "login" | "register" | "forgot" | "reset";
const titles = {
  login: "С возвращением",
  register: "Начнём с знакомства",
  forgot: "Восстановление пароля",
  reset: "Новый пароль",
};
const subtitles = {
  login: "Войдите, чтобы продолжить работу над проектами.",
  register: "Создайте аккаунт. Роль выберете на следующем шаге.",
  forgot: "Отправим на почту ссылку для восстановления.",
  reset: "Задайте новый пароль для своего аккаунта.",
};
function authFailure(code?: string) {
  const messages: Record<string, string> = {
    invalid_credentials: "Неверная почта или пароль.",
    email_not_confirmed: "Подтвердите почту по ссылке из письма.",
    user_already_exists: "Аккаунт с этой почтой уже существует.",
    weak_password: "Выберите более надёжный пароль.",
    over_email_send_rate_limit:
      "Письмо уже отправлено. Подождите перед повтором.",
    over_request_rate_limit: "Слишком много попыток. Попробуйте позже.",
    same_password: "Новый пароль должен отличаться от текущего.",
  };
  return new ApiError(
    400,
    code || "auth_error",
    messages[code || ""] ||
      "Не удалось выполнить действие. Проверьте данные и доступность сервиса.",
  );
}
export function AuthForm({ mode }: { mode: AuthMode }) {
  const query = useSearchParams();
  const router = useRouter();
  const action = useAction();
  const [sent, setSent] = useState(false);
  const next = safePath(query.get("next"));
  async function finish() {
    try {
      const profile = await profiles.get();
      router.replace(roleDestination(profile.role, next));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "profile_required") {
        router.replace("/complete-profile?next=" + encodeURIComponent(next));
      } else throw error;
    }
  }
  return (
    <main id="main" className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">ВАШ СЛЕДУЮЩИЙ ПРОЕКТ</p>
          <h1>
            Большие идеи
            <br />
            начинаются
            <br />с первого шага.
          </h1>
          <p>
            Соберите понятную задачу. Найдите свою команду. Создайте то, что
            имеет значение.
          </p>
        </div>
        <div className="orb" aria-hidden="true" />
        <footer>AI SANA · CHALLENGE HUB</footer>
      </section>
      <section className="auth-content">
        <div className="auth-card">
          <p className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В AI SANA</p>
          <h1>{titles[mode]}</h1>
          <p className="muted">{subtitles[mode]}</p>
          {!authConfigured && (
            <div className="notice info">
              Сервис временно недоступен / требуется настройка авторизации.
            </div>
          )}
          {query.has("error") && (
            <div className="notice error" role="alert">
              Ссылка недействительна или устарела. Запросите новое письмо.
            </div>
          )}
          <ErrorNotice error={action.error} />
          <Success>{action.success}</Success>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const email = String(form.get("email") || "").trim();
              const password = String(form.get("password") || "");
              void action.run(async () => {
                const auth = browserAuth().auth;
                if (mode === "login") {
                  const { error } = await auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error) throw authFailure(error.code);
                  await finish();
                }
                if (mode === "register") {
                  const { data, error } = await auth.signUp({
                    email,
                    password,
                    options: {
                      emailRedirectTo:
                        window.location.origin +
                        "/auth/callback?next=" +
                        encodeURIComponent(next),
                    },
                  });
                  if (error) throw authFailure(error.code);
                  if (data.session) await finish();
                  else {
                    setSent(true);
                    action.setSuccess(
                      "Проверьте почту и подтвердите регистрацию по ссылке из письма.",
                    );
                  }
                }
                if (mode === "forgot") {
                  const { error } = await auth.resetPasswordForEmail(email, {
                    redirectTo:
                      window.location.origin +
                      "/auth/callback?next=/reset-password",
                  });
                  if (error) throw authFailure(error.code);
                  setSent(true);
                  action.setSuccess(
                    "Если аккаунт существует, письмо с инструкцией отправлено. Проверьте также папку «Спам».",
                  );
                }
                if (mode === "reset") {
                  if (password !== form.get("confirm"))
                    throw new ApiError(
                      422,
                      "password_mismatch",
                      "Пароли не совпадают.",
                    );
                  const { data } = await auth.getSession();
                  if (!data.session)
                    throw new ApiError(
                      401,
                      "recovery_required",
                      "Сначала откройте ссылку восстановления из письма.",
                    );
                  const { error } = await auth.updateUser({ password });
                  if (error) throw authFailure(error.code);
                  setSent(true);
                  action.setSuccess(
                    "Пароль обновлён. Можно продолжить работу.",
                  );
                }
              });
            }}
          >
            {mode !== "reset" && (
              <label className="field">
                <span>Электронная почта</span>
                <input
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="field">
                <span>Пароль</span>
                <input
                  required
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? 1 : 8}
                  maxLength={128}
                  placeholder={
                    mode === "login" ? "Введите пароль" : "Не менее 8 символов"
                  }
                />
              </label>
            )}
            {mode === "reset" && (
              <label className="field">
                <span>Повторите пароль</span>
                <input
                  required
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>
            )}
            <Button
              type="submit"
              busy={action.busy}
              disabled={!authConfigured || sent}
            >
              {mode === "login"
                ? "Войти"
                : mode === "register"
                  ? "Создать аккаунт"
                  : mode === "forgot"
                    ? "Отправить ссылку"
                    : "Сохранить пароль"}
            </Button>
          </form>
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <Link href={"/register?next=" + encodeURIComponent(next)}>
                  Создать аккаунт
                </Link>
                <Link href="/forgot-password">Забыли пароль?</Link>
              </>
            ) : (
              <>
                <Link href={"/login?next=" + encodeURIComponent(next)}>
                  Вернуться ко входу
                </Link>
                {sent && mode === "reset" && (
                  <Link href="/complete-profile">Продолжить</Link>
                )}
              </>
            )}
          </div>
          <div className="auth-links">
            <Link href="/">← На главную</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
