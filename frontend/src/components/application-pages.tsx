"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Sparkles } from "lucide-react";
import { applications } from "@/api/applications";
import { useAction, useResource } from "@/hooks/use-resource";
import type { Role, ApplicationFields } from "@/types/api";
import {
  ApplicationCard,
  ApplicationContent,
  FlowSteps,
  ReadinessProgress,
  fieldLabels,
} from "./application-ui";
import {
  ActionLink,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  Success,
} from "./ui";
import { parseSkills } from "./profile-form";
export function ApplicationList({ role }: { role: Role }) {
  const query = useSearchParams();
  const router = useRouter();
  const search = query.get("search") || "";
  const skill = query.get("skill") || "";
  const sort = query.get("sort") === "oldest" ? "oldest" : "newest";
  const rawStatus = query.get("status");
  const status = ["draft", "published", "closed"].includes(rawStatus || "")
    ? rawStatus || undefined
    : undefined;
  const offset = Math.max(0, Number.parseInt(query.get("offset") || "0") || 0);
  const limit = 12;
  const state = useResource(role + query.toString(), () =>
    role === "business"
      ? applications.own({ search, status, limit, offset })
      : applications.catalog({ search, skill, sort, limit, offset }),
  );
  function navigate(values: Record<string, string>) {
    const params = new URLSearchParams(values);
    router.push("/" + role + "/applications?" + params.toString());
  }
  return (
    <>
      <PageHeader
        title={
          role === "business" ? "Мои заявки" : "Найдите свой следующий проект"
        }
        description={
          role === "business"
            ? "Превращайте идеи в понятные задачи и знакомьтесь с командами."
            : "Реальные задачи бизнеса, в которых пригодятся ваши навыки."
        }
        action={
          role === "business" ? (
            <ActionLink href="/business/applications/create">
              <Plus size={16} />
              Создать заявку
            </ActionLink>
          ) : undefined
        }
      />
      <form
        className="filter-bar"
        key={query.toString()}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          navigate(
            Object.fromEntries(
              Array.from(data.entries()).map(([key, value]) => [
                key,
                String(value).trim(),
              ]),
            ),
          );
        }}
      >
        <label className="field">
          <span>Поиск по названию</span>
          <input
            name="search"
            maxLength={200}
            defaultValue={search}
            placeholder="Какой проект вы ищете?"
          />
        </label>
        {role === "student" ? (
          <>
            <label className="field">
              <span>Точный навык</span>
              <input
                name="skill"
                maxLength={80}
                defaultValue={skill}
                placeholder="Например, Python"
              />
            </label>
            <label className="field">
              <span>Сортировка</span>
              <select name="sort" defaultValue={sort}>
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
              </select>
            </label>
          </>
        ) : (
          <label className="field">
            <span>Статус</span>
            <select name="status" defaultValue={status || ""}>
              <option value="">Все заявки</option>
              <option value="draft">Черновики</option>
              <option value="published">Опубликованные</option>
              <option value="closed">Закрытые</option>
            </select>
          </label>
        )}
        <Button type="submit">
          <Search size={15} />
          Найти
        </Button>
      </form>
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <>
            {state.data.items.length ? (
              <div className="grid-two">
                {state.data.items.map((a) => (
                  <ApplicationCard key={a.id} application={a} role={role} />
                ))}
              </div>
            ) : (
              <EmptyState title="Заявки не найдены">
                {search || skill
                  ? "Измените поисковый запрос или фильтр."
                  : role === "business"
                    ? "Начните с описания вашей первой задачи."
                    : "Опубликованные проекты появятся здесь."}
              </EmptyState>
            )}
            <Pagination
              total={state.data.total}
              offset={offset}
              limit={limit}
              onChange={(value) =>
                navigate({
                  ...Object.fromEntries(query.entries()),
                  offset: String(value),
                })
              }
            />
          </>
        )
      )}
    </>
  );
}
export function CreateApplication() {
  const router = useRouter();
  const action = useAction();
  return (
    <>
      <PageHeader
        title="С чего начнём?"
        description="Расскажите о задаче своими словами. Достаточно нескольких предложений."
      />
      <FlowSteps step={0} />
      <div className="split">
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void action.run(
              () =>
                applications.create({
                  description: String(data.get("description")).trim(),
                }),
              (a) =>
                router.push("/business/applications/" + a.id + "/ai-analysis"),
            );
          }}
        >
          <div className="ai-heading">
            <span>
              <Sparkles size={21} />
            </span>
            <div>
              <h2>Какая задача стоит перед вами?</h2>
              <p className="field-hint">
                Не нужно готовить техническое задание заранее.
              </p>
            </div>
          </div>
          <label className="field">
            <span>Описание задачи</span>
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={10000}
              rows={8}
              placeholder="Например: мы тратим много времени на ручной разбор обращений клиентов. Хотим понимать основные темы и быстрее находить повторяющиеся проблемы."
            />
            <small>
              От 20 до 10 000 символов. Укажите только известные вам факты.
            </small>
          </label>
          <ErrorNotice error={action.error} />
          <div className="actions">
            <Button type="submit" busy={action.busy}>
              Создать черновик и продолжить
            </Button>
          </div>
        </form>
        <aside className="panel">
          <p className="eyebrow">ЧТО ДАЛЬШЕ?</p>
          <h3>Придадим идее форму</h3>
          <p className="muted">
            Сначала сохраним черновик. Затем ИИ предложит вопросы о цели,
            результатах, данных и необходимых навыках.
          </p>
          <p className="field-hint" style={{ marginTop: 18 }}>
            Черновик доступен только вам. Публикация — отдельный шаг.
          </p>
        </aside>
      </div>
    </>
  );
}
export function ApplicationDetails({
  id,
  role,
  preview = false,
}: {
  id: string;
  role: Role;
  preview?: boolean;
}) {
  const state = useResource(id, () => applications.get(id));
  const action = useAction();
  const [closing, setClosing] = useState(false);
  const router = useRouter();
  if (state.loading) return <LoadingSkeleton />;
  if (state.error)
    return <ErrorNotice error={state.error} retry={state.reload} />;
  const a = state.data;
  if (!a) return null;
  return (
    <>
      <PageHeader
        title={
          preview ? "Проверьте заявку перед публикацией" : "Детали проекта"
        }
        description={
          preview
            ? "Убедитесь, что цель и ожидаемый результат понятны будущей команде."
            : a.organization_name
        }
        action={
          <ActionLink secondary href={"/" + role + "/applications"}>
            К списку
          </ActionLink>
        }
      />
      {preview && <FlowSteps step={2} />}
      <ErrorNotice error={action.error} />
      <Success>{action.success}</Success>
      <div className="split">
        <ApplicationContent application={a} />
        <aside className="stack">
          {role === "business" ? (
            <>
              <ReadinessProgress score={a.readiness_score} />
              {a.status === "draft" ? (
                <section className="panel stack">
                  {preview ? (
                    <>
                      <Button
                        disabled={a.readiness_score !== 100}
                        busy={action.busy}
                        onClick={() =>
                          action.run(
                            () => applications.publish(id),
                            (updated) => {
                              state.setData(updated);
                              router.replace("/business/applications/" + id);
                            },
                            "Заявка опубликована и доступна командам.",
                          )
                        }
                      >
                        Опубликовать заявку
                      </Button>
                      {a.readiness_score !== 100 && (
                        <p className="field-hint">
                          Для публикации нужна готовность 100%.
                        </p>
                      )}
                    </>
                  ) : (
                    <ActionLink
                      href={"/business/applications/" + id + "/preview"}
                    >
                      Предпросмотр
                    </ActionLink>
                  )}
                  <ActionLink
                    secondary
                    href={"/business/applications/" + id + "/ai-analysis"}
                  >
                    <Sparkles size={16} />
                    Продолжить с ИИ
                  </ActionLink>
                  <Link
                    className="text-button"
                    href={"/business/applications/" + id + "/edit"}
                  >
                    Редактировать вручную
                  </Link>
                </section>
              ) : (
                <section className="panel stack">
                  <ActionLink
                    href={"/business/applications/" + id + "/responses"}
                  >
                    Отклики команд
                  </ActionLink>
                  {a.status === "published" && (
                    <Button
                      className="secondary"
                      onClick={() => setClosing(true)}
                    >
                      Закрыть заявку
                    </Button>
                  )}
                </section>
              )}
            </>
          ) : (
            <section className="panel stack">
              <h3>Готовы взяться за задачу?</h3>
              <p className="muted">
                Загрузите состав команды и проверьте, подходят ли ваши навыки и
                опыт.
              </p>
              {a.status === "published" ? (
                <ActionLink href={"/student/applications/" + id + "/apply"}>
                  Подать заявку
                </ActionLink>
              ) : (
                <p className="field-hint">Приём откликов завершён.</p>
              )}
            </section>
          )}
        </aside>
      </div>
      <ConfirmDialog
        open={closing}
        title="Закрыть заявку?"
        busy={action.busy}
        onCancel={() => setClosing(false)}
        onConfirm={() =>
          action.run(
            () => applications.close(id),
            (updated) => {
              state.setData(updated);
              setClosing(false);
            },
            "Заявка закрыта.",
          )
        }
      >
        <p>
          Новые команды больше не смогут откликнуться. Это действие нельзя
          отменить.
        </p>
        <ErrorNotice error={action.error} />
      </ConfirmDialog>
    </>
  );
}
export function EditApplication({ id }: { id: string }) {
  const state = useResource(id, () => applications.get(id));
  const action = useAction();
  const router = useRouter();
  if (state.loading) return <LoadingSkeleton />;
  if (state.error)
    return <ErrorNotice error={state.error} retry={state.reload} />;
  const a = state.data;
  if (!a) return null;
  return (
    <>
      <PageHeader
        title="Редактирование заявки"
        description="После сохранения потребуется повторить анализ, прежде чем отвечать на вопросы ИИ."
        action={
          <ActionLink secondary href={"/business/applications/" + id}>
            К заявке
          </ActionLink>
        }
      />
      {a.status !== "draft" ? (
        <div className="notice info">Редактировать можно только черновик.</div>
      ) : (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const field = (name: string) => String(data.get(name) || "").trim();
            const body: ApplicationFields = {
              title: field("title"),
              description: field("description"),
              goal: field("goal"),
              target_audience: field("target_audience"),
              expected_result: field("expected_result"),
              timeline: field("timeline"),
              available_data: field("available_data"),
              success_criteria: field("success_criteria"),
              required_skills: parseSkills(field("required_skills")),
              min_experience_years: Number(field("min_experience_years")),
            };
            void action.run(
              () => applications.update(id, body),
              () =>
                router.push(
                  "/business/applications/" + id + "/ai-analysis?edited=1",
                ),
            );
          }}
        >
          <div className="grid-two">
            {(
              [
                "title",
                "description",
                "goal",
                "target_audience",
                "expected_result",
                "timeline",
                "available_data",
                "success_criteria",
              ] as const
            ).map((field) => (
              <label
                key={field}
                className={"field " + (field === "description" ? "full" : "")}
              >
                <span>{fieldLabels[field]}</span>
                {field === "title" || field === "timeline" ? (
                  <input
                    name={field}
                    defaultValue={a[field]}
                    maxLength={field === "title" ? 200 : 1000}
                  />
                ) : (
                  <textarea
                    name={field}
                    defaultValue={a[field]}
                    required={field === "description"}
                    minLength={field === "description" ? 20 : undefined}
                    maxLength={field === "description" ? 10000 : 3000}
                  />
                )}
              </label>
            ))}
            <label className="field">
              <span>Навыки через запятую</span>
              <input
                name="required_skills"
                defaultValue={a.required_skills.join(", ")}
              />
            </label>
            <label className="field">
              <span>Минимальный опыт, лет</span>
              <input
                type="number"
                name="min_experience_years"
                min={0}
                max={80}
                step="0.1"
                required
                defaultValue={a.min_experience_years}
              />
              <small>Опыт не влияет на готовность заявки.</small>
            </label>
          </div>
          <ErrorNotice error={action.error} />
          <div className="actions">
            <Button busy={action.busy} type="submit">
              Сохранить изменения
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
