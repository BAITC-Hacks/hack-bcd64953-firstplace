"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { responses } from "@/api/responses";
import { useAction, useResource } from "@/hooks/use-resource";
import type { ProjectResponse, Role } from "@/types/api";
import { TeamCard, MatchProgress } from "./team-ui";
import {
  ActionLink,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  Success,
  dateText,
  statusLabels,
} from "./ui";
export function ResponseCard({
  response: r,
  role,
  onUpdated,
}: {
  response: ProjectResponse;
  role: Role;
  onUpdated?: () => void;
}) {
  const action = useAction();
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(
    null,
  );
  return (
    <article className="response-card">
      <div className="card-top">
        <h2>{r.team.student.team_name || r.team.display_name}</h2>
        <Badge tone={r.status}>{statusLabels[r.status]}</Badge>
      </div>
      <div className="card-meta">
        <span>{dateText(r.created_at)}</span>
        <span>{r.team.members.length} участников</span>
        <span>Соответствие: {r.evaluation.score}%</span>
      </div>
      <Link
        className="text-button"
        href={"/" + role + "/applications/" + r.application_id}
      >
        Открыть проект ↗
      </Link>
      {r.message && <p className="message">{r.message}</p>}
      <ErrorNotice error={action.error} />
      <Success>{action.success}</Success>
      <div className="actions">
        {role === "business" ? (
          <>
            <ActionLink secondary href={"/business/teams/" + r.team.id}>
              Состав команды
            </ActionLink>
            <Link className="text-button" href={"/business/responses/" + r.id}>
              Полный отклик
            </Link>
            {r.status === "pending" && (
              <>
                <Button
                  disabled={action.busy}
                  onClick={() => setDecision("accepted")}
                >
                  Принять
                </Button>
                <Button
                  className="secondary"
                  disabled={action.busy}
                  onClick={() => setDecision("rejected")}
                >
                  Отклонить
                </Button>
              </>
            )}
          </>
        ) : (
          <ActionLink secondary href={"/student/responses/" + r.id}>
            Подробнее об отклике
          </ActionLink>
        )}
      </div>
      <ConfirmDialog
        open={decision !== null}
        title={
          decision === "accepted" ? "Принять команду?" : "Отклонить отклик?"
        }
        busy={action.busy}
        onCancel={() => setDecision(null)}
        onConfirm={() => {
          if (decision)
            void action.run(
              () => responses.decide(r.id, decision),
              () => {
                setDecision(null);
                onUpdated?.();
              },
              "Решение сохранено.",
            );
        }}
      >
        <p>
          Команда получит уведомление. После сохранения изменить решение нельзя.
        </p>
        <ErrorNotice error={action.error} />
      </ConfirmDialog>
    </article>
  );
}
export function ResponseList({
  role,
  applicationId,
}: {
  role: Role;
  applicationId?: string;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 12;
  const state = useResource(role + (applicationId || "") + offset, () =>
    applicationId
      ? responses.forApplication(applicationId, { limit, offset })
      : responses.list(role, { limit, offset }),
  );
  return (
    <>
      <PageHeader
        title={role === "business" ? "Отклики команд" : "Мои отклики"}
        description={
          role === "business"
            ? "Изучите состав команды и её соответствие задаче перед решением."
            : "Следите за рассмотрением заявок и ответами бизнеса."
        }
        action={
          applicationId ? (
            <ActionLink
              secondary
              href={"/business/applications/" + applicationId}
            >
              К заявке
            </ActionLink>
          ) : undefined
        }
      />
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <>
            {state.data.items.length ? (
              <div className="stack">
                {state.data.items.map((r) => (
                  <ResponseCard
                    key={r.id}
                    response={r}
                    role={role}
                    onUpdated={state.reload}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Откликов пока нет">
                {role === "business"
                  ? "После публикации заявки команды смогут отправлять отклики."
                  : "Выберите проект и проверьте соответствие команды."}
              </EmptyState>
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
export function ResponseDetails({ id, role }: { id: string; role: Role }) {
  const query = useSearchParams();
  const state = useResource(id, () => responses.get(id));
  return (
    <>
      <PageHeader
        title="Отклик команды"
        action={
          <ActionLink secondary href={"/" + role + "/responses"}>
            Все отклики
          </ActionLink>
        }
      />
      {query.has("submitted") && (
        <Success>
          Отклик отправлен. Решение появится здесь и в уведомлениях.
        </Success>
      )}
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <div className="stack">
            <ResponseCard
              response={state.data}
              role={role}
              onUpdated={state.reload}
            />
            <TeamCard team={state.data.team} />
            <MatchProgress result={state.data.evaluation} />
            {state.data.decided_at && (
              <p className="field-hint">
                Решение принято {dateText(state.data.decided_at)}.
              </p>
            )}
          </div>
        )
      )}
    </>
  );
}
export function TeamDetails({ id }: { id: string }) {
  const state = useResource(id, () => responses.team(id));
  return (
    <>
      <PageHeader
        title="Профиль команды"
        action={
          <ActionLink secondary href="/business/responses">
            К откликам
          </ActionLink>
        }
      />
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && <TeamCard team={state.data} />
      )}
    </>
  );
}
