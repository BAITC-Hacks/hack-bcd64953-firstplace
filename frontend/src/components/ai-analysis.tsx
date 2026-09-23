"use client";
import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { applications } from "@/api/applications";
import { ApiError } from "@/api/client";
import { useAction, useResource } from "@/hooks/use-resource";
import {
  ActionLink,
  Button,
  ErrorNotice,
  LoadingSkeleton,
  PageHeader,
  Success,
} from "./ui";
import { FlowSteps, ReadinessProgress, fieldLabels } from "./application-ui";
export function AIAnalysis({ id }: { id: string }) {
  const query = useSearchParams();
  const action = useAction();
  const [stale, setStale] = useState(false);
  const state = useResource(id, async () => {
    const [application, analysis] = await Promise.all([
      applications.get(id),
      applications.analysis(id).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
    ]);
    return { application, analysis };
  });
  if (state.loading) return <LoadingSkeleton />;
  if (state.error)
    return <ErrorNotice error={state.error} retry={state.reload} />;
  if (!state.data) return null;
  const { application: a, analysis } = state.data;
  const outdated =
    stale || Boolean(analysis && analysis.application_revision !== a.revision);
  const usable = analysis && !outdated;
  const isDraft = a.status === "draft";
  function analyze() {
    void action.run(
      async () => {
        const analysis = await applications.analyze(id);
        const application = await applications.get(id);
        return { analysis, application };
      },
      (value) => {
        state.setData(value);
        setStale(false);
      },
      "Анализ завершён. Ответьте на вопросы ниже.",
    );
  }
  return (
    <>
      <PageHeader
        title="Уточним вашу идею"
        description="ИИ задаёт вопросы. Вы добавляете факты. Готовность рассчитывает сервис."
        action={
          <ActionLink secondary href={"/business/applications/" + id}>
            К заявке
          </ActionLink>
        }
      />
      <FlowSteps step={1} />
      <ErrorNotice error={action.error} />
      <Success>{action.success}</Success>
      {(outdated || (query.has("edited") && !analysis)) && (
        <div className="notice info">
          Заявка была изменена. Выполните анализ повторно.
        </div>
      )}
      <div className="split">
        <div className="stack">
          <section className="panel">
            <p className="eyebrow">ВАША ЗАДАЧА · ВЕРСИЯ {a.revision}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{a.description}</p>
          </section>
          <section className="panel">
            <div className="ai-heading">
              <span>
                <Sparkles size={24} />
              </span>
              <div>
                <h2>Помощник по проекту</h2>
                <p className="field-hint">
                  От общей идеи к конкретным результатам
                </p>
              </div>
            </div>
            {!isDraft ? (
              <p className="muted">Анализ доступен только для черновиков.</p>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: 20 }}>
                  {usable
                    ? "Проверьте рекомендации и ответьте на вопросы. Неизвестные детали можно уточнить позже."
                    : "Запустите анализ, чтобы получить рекомендации и вопросы по незаполненным разделам."}
                </p>
                <Button busy={action.busy} onClick={analyze}>
                  {analysis ? <RefreshCw size={16} /> : <Sparkles size={16} />}{" "}
                  {analysis ? "Повторить анализ" : "Запустить ИИ-анализ"}
                </Button>
              </>
            )}
            {usable && (
              <div style={{ marginTop: 25 }}>
                <div className="ai-summary">{analysis.summary}</div>
                {analysis.recommendations.length > 0 && (
                  <>
                    <h3>Рекомендации</h3>
                    <ul className="recommendations">
                      {analysis.recommendations.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
          {usable && isDraft && analysis.questions.some((q) => !q.answer) && (
            <form
              className="panel"
              key={analysis.id}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const answers = analysis.questions
                  .filter((q) => !q.answer)
                  .map((q) => ({
                    question_id: q.id,
                    answer: String(data.get(q.id) || "").trim(),
                  }))
                  .filter((q) => q.answer);
                if (!answers.length) {
                  action.setError(
                    new ApiError(
                      422,
                      "answers_required",
                      "Ответьте хотя бы на один вопрос.",
                    ),
                  );
                  return;
                }
                void action.run(
                  async () => {
                    try {
                      return await applications.answers(id, { answers });
                    } catch (error) {
                      if (error instanceof ApiError && error.status === 409) {
                        setStale(true);
                        throw new ApiError(
                          409,
                          "stale_analysis",
                          "Заявка была изменена. Выполните анализ повторно.",
                          error.details,
                          error.requestId,
                        );
                      }
                      throw error;
                    }
                  },
                  (application) => {
                    state.setData({ application, analysis: null });
                  },
                  "Ответы сохранены. Готовность заявки обновлена.",
                );
              }}
            >
              <h2>Вопросы к вам</h2>
              {analysis.questions.map((q, index) => (
                <div key={q.id} className="question">
                  <label htmlFor={q.id} className="question-label">
                    <b aria-hidden="true">{index + 1}</b>
                    <span>{q.question}</span>
                  </label>
                  {q.answer ? (
                    <p className="muted">{q.answer}</p>
                  ) : (
                    <textarea
                      id={q.id}
                      name={q.id}
                      maxLength={3000}
                      rows={3}
                      placeholder={
                        q.field === "required_skills"
                          ? "Python; SQL; NLP"
                          : "Ваш ответ…"
                      }
                      disabled={action.busy}
                    />
                  )}
                  <small className="field-hint">{fieldLabels[q.field]}</small>
                </div>
              ))}
              <Button type="submit" busy={action.busy}>
                Сохранить ответы
              </Button>
            </form>
          )}
        </div>
        <aside className="stack">
          <ReadinessProgress
            score={a.readiness_score}
            readiness={usable ? analysis.readiness : undefined}
          />
          {a.readiness_score === 100 ? (
            <ActionLink href={"/business/applications/" + id + "/preview"}>
              Перейти к предпросмотру
            </ActionLink>
          ) : (
            isDraft && (
              <div className="panel stack">
                <p className="field-hint">
                  Если остались пробелы, повторите анализ или заполните поля
                  вручную.
                </p>
                <ActionLink
                  secondary
                  href={"/business/applications/" + id + "/edit"}
                >
                  Редактировать поля
                </ActionLink>
                <ActionLink
                  secondary
                  href={"/business/applications/" + id + "/preview"}
                >
                  Предпросмотр
                </ActionLink>
              </div>
            )
          )}
        </aside>
      </div>
    </>
  );
}
