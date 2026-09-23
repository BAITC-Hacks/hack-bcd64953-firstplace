"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Bell, Check, ShieldCheck, Sparkles } from "lucide-react";
import { applications } from "@/api/applications";
import { responses } from "@/api/responses";
import { notifications } from "@/api/notifications";
import { ApiError } from "@/api/client";
import { browserAuth } from "@/auth/browser";
import { useProfile } from "@/auth/profile-context";
import { useAction, useResource } from "@/hooks/use-resource";
import { roleDestination } from "@/validators/navigation";
import type { Role } from "@/types/api";
import { ApplicationCard } from "./application-ui";
import {
  ActionLink,
  Button,
  EmptyState,
  ErrorNotice,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  Success,
  dateText,
} from "./ui";
export function Dashboard({ role }: { role: Role }) {
  const { profile } = useProfile();
  const state = useResource(role, async () => {
    if (role === "business") {
      const [recent, drafts, published, inbox] = await Promise.all([
        applications.own({ limit: 4, offset: 0 }),
        applications.own({ limit: 1, offset: 0, status: "draft" }),
        applications.own({ limit: 1, offset: 0, status: "published" }),
        responses.list(role, { limit: 1, offset: 0 }),
      ]);
      return {
        recent,
        stats: [
          {
            label: "Черновики",
            value: drafts.total,
            hint: "Можно продолжить подготовку",
          },
          {
            label: "Опубликованные заявки",
            value: published.total,
            hint: "Доступны студенческим командам",
          },
          {
            label: "Отклики команд",
            value: inbox.total,
            hint: "Все статусы рассмотрения",
          },
        ],
      };
    }
    const [recent, inbox] = await Promise.all([
      applications.catalog({ limit: 4, offset: 0, sort: "newest" }),
      responses.list(role, { limit: 1, offset: 0 }),
    ]);
    return {
      recent,
      stats: [
        {
          label: "Проекты в каталоге",
          value: recent.total,
          hint: "Опубликованные задачи бизнеса",
        },
        {
          label: "Мои отклики",
          value: inbox.total,
          hint: "Все отправленные отклики",
        },
      ],
    };
  });
  return (
    <>
      <PageHeader
        title={"Здравствуйте, " + profile.display_name}
        description="Всё, что нужно для следующего шага, — в одном месте."
      />
      <section className="dashboard-banner">
        <div>
          <p className="eyebrow">
            {role === "business"
              ? "ОТ ИДЕИ К РЕАЛЬНОМУ ПРОЕКТУ"
              : "ОТ НАВЫКОВ К РЕАЛЬНОМУ ОПЫТУ"}
          </p>
          <h2>
            {role === "business"
              ? "У вашей идеи есть будущее. Найдём для неё команду."
              : "Ваши знания могут решить настоящую задачу."}
          </h2>
          <p>
            {role === "business"
              ? "Опишите проблему. ИИ поможет уточнить детали, а студенческие команды предложат свои навыки."
              : "Откройте каталог, выберите интересный проект и проверьте соответствие своей команды."}
          </p>
          <ActionLink
            href={
              role === "business"
                ? "/business/applications/create"
                : "/student/applications"
            }
          >
            {role === "business" ? "Создать заявку" : "Найти проект"}
          </ActionLink>
        </div>
        <div className="banner-art" aria-hidden="true">
          <Sparkles size={65} strokeWidth={1} />
        </div>
      </section>
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <div className="stack">
            <div className={role === "business" ? "grid-three" : "grid-two"}>
              {state.data.stats.map((stat) => (
                <article key={stat.label} className="stat-card">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.hint}</small>
                </article>
              ))}
            </div>
            <div className="card-top" style={{ marginTop: 12 }}>
              <h2>
                {role === "business" ? "Последние заявки" : "Новые проекты"}
              </h2>
              <Link href={"/" + role + "/applications"} className="text-button">
                Все проекты <ArrowUpRight size={15} />
              </Link>
            </div>
            {state.data.recent.items.length ? (
              <div className="grid-two">
                {state.data.recent.items.map((a) => (
                  <ApplicationCard key={a.id} application={a} role={role} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  role === "business"
                    ? "Ваша первая заявка — впереди"
                    : "Новых проектов пока нет"
                }
              />
            )}
          </div>
        )
      )}
    </>
  );
}
export function NotificationsPage({ role }: { role: Role }) {
  const [unread, setUnread] = useState(false);
  const [offset, setOffset] = useState(0);
  const action = useAction();
  const limit = 15;
  const state = useResource(String(unread) + offset, () =>
    notifications.list({ unread_only: unread, limit, offset }),
  );
  return (
    <>
      <PageHeader
        title="Уведомления"
        description="Важные изменения по заявкам и откликам."
      />
      <label className="check-label" style={{ marginBottom: 24 }}>
        <input
          type="checkbox"
          checked={unread}
          onChange={(event) => {
            setUnread(event.target.checked);
            setOffset(0);
          }}
        />
        Только непрочитанные
      </label>
      <ErrorNotice error={action.error} />
      <Success>{action.success}</Success>
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <>
            {state.data.items.length ? (
              <div className="stack">
                {state.data.items.map((n) => (
                  <article
                    key={n.id}
                    className={"notification " + (!n.is_read ? "unread" : "")}
                  >
                    <Bell size={20} color={n.is_read ? "#96a5b9" : "#4169f5"} />
                    <div>
                      <h2>{n.title}</h2>
                      <p>{n.body}</p>
                      <div className="actions">
                        <small>
                          {dateText(n.created_at)} ·{" "}
                          {n.is_read ? "Прочитано" : "Новое"}
                        </small>
                        {n.link && (
                          <Link
                            className="text-button"
                            href={roleDestination(role, n.link)}
                          >
                            Открыть ↗
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <Button
                        className="secondary"
                        busy={action.busy}
                        onClick={() =>
                          action.run(
                            () => notifications.read(n.id),
                            () => state.reload(),
                            "Уведомление отмечено прочитанным.",
                          )
                        }
                      >
                        <Check size={14} />
                        Прочитано
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  unread ? "Все уведомления прочитаны" : "Уведомлений пока нет"
                }
              />
            )}
            <Pagination
              total={state.data.total}
              offset={offset}
              limit={limit}
              onChange={setOffset}
            />
          </>
        )
      )}
    </>
  );
}
export function SettingsPage() {
  const { profile } = useProfile();
  const action = useAction();
  return (
    <>
      <PageHeader
        title="Настройки"
        description="Управляйте безопасностью своего аккаунта."
      />
      <div className="split">
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const password = String(data.get("password"));
            if (password !== data.get("confirm")) {
              action.setError(
                new ApiError(422, "password_mismatch", "Пароли не совпадают."),
              );
              return;
            }
            void action.run(
              async () => {
                const { error } = await browserAuth().auth.updateUser({
                  password,
                });
                if (error)
                  throw new ApiError(
                    400,
                    "password_update_failed",
                    "Не удалось изменить пароль. Возможно, требуется повторный вход или более надёжный пароль.",
                  );
              },
              () => form.reset(),
              "Пароль обновлён.",
            );
          }}
        >
          <div className="ai-heading">
            <span>
              <ShieldCheck size={24} />
            </span>
            <h2>Изменить пароль</h2>
          </div>
          <p className="field-hint">Аккаунт: {profile.email}</p>
          <label className="field">
            <span>Новый пароль</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          <label className="field">
            <span>Повторите пароль</span>
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          <ErrorNotice error={action.error} />
          <Success>{action.success}</Success>
          <div className="actions">
            <Button type="submit" busy={action.busy}>
              Обновить пароль
            </Button>
          </div>
        </form>
        <aside className="panel stack">
          <h3>Ваше пространство</h3>
          <p className="muted">
            {profile.role === "business" ? "Бизнес" : "Студенческая команда"}
          </p>
          <p className="field-hint">
            Роль фиксируется при создании профиля. Данные организации или
            команды можно изменить в профиле.
          </p>
          <ActionLink secondary href={"/" + profile.role + "/profile"}>
            Открыть профиль
          </ActionLink>
          <Link className="text-button" href="/forgot-password">
            Восстановить доступ по почте
          </Link>
        </aside>
      </div>
    </>
  );
}
