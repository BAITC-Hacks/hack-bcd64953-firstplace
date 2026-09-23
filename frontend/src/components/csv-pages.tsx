"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, UploadCloud, RefreshCw } from "lucide-react";
import { applications } from "@/api/applications";
import { csv } from "@/api/csv";
import { responses } from "@/api/responses";
import { ApiError } from "@/api/client";
import { useAction, useResource } from "@/hooks/use-resource";
import { CSV_TEMPLATE, csvPrecheck, isUuid } from "@/validators/csv";
import { Members, MatchProgress } from "./team-ui";
import {
  ActionLink,
  Button,
  ErrorNotice,
  LoadingSkeleton,
  PageHeader,
  Success,
} from "./ui";
export function CSVApply({ id }: { id: string }) {
  const state = useResource(id, () => applications.get(id));
  const action = useAction();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  function download() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-sana-team-template.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageHeader
        title="Познакомьте нас с командой"
        description="Загрузите участников, чтобы проверить навыки и опыт перед откликом."
        action={
          <ActionLink secondary href={"/student/applications/" + id}>
            К проекту
          </ActionLink>
        }
      />
      {state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <div className="split">
            <div className="stack">
              <section className="panel">
                <p className="eyebrow">ВЫБРАННЫЙ ПРОЕКТ</p>
                <h2>{state.data.title}</h2>
                <div className="skill-list">
                  {state.data.required_skills.map((skill) => (
                    <span className="skill" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
              <form
                className="panel stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!file) return;
                  const error = csvPrecheck(file);
                  if (error) {
                    action.setError(new ApiError(422, "file_precheck", error));
                    return;
                  }
                  void action.run(
                    () => csv.upload(id, file),
                    (upload) =>
                      router.push(
                        "/student/applications/" +
                          id +
                          "/csv-check?upload_id=" +
                          upload.id,
                      ),
                  );
                }}
              >
                <div className="upload-zone">
                  <UploadCloud size={34} color="#6d8bce" />
                  <h2>Состав команды в CSV</h2>
                  <p>UTF-8 · До 5 МиБ · От 1 до 50 участников</p>
                  <label className="field">
                    <span>Выберите файл команды</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      required
                      disabled={action.busy}
                      onChange={(event) => {
                        const selected = event.target.files?.[0] || null;
                        setFile(selected);
                        action.setError(
                          selected && csvPrecheck(selected)
                            ? new ApiError(
                                422,
                                "file_precheck",
                                csvPrecheck(selected) || "",
                              )
                            : null,
                        );
                      }}
                    />
                  </label>
                  {file && (
                    <p>
                      {file.name} · {(file.size / 1024).toFixed(1)} КиБ
                    </p>
                  )}
                </div>
                <ErrorNotice error={action.error} />
                <Button
                  type="submit"
                  busy={action.busy}
                  disabled={
                    !file ||
                    Boolean(file && csvPrecheck(file)) ||
                    state.data.status !== "published"
                  }
                >
                  Загрузить и проверить CSV
                </Button>
                {state.data.status !== "published" && (
                  <p className="field-hint">
                    Приём откликов по этому проекту закрыт.
                  </p>
                )}
                <p className="field-hint">
                  Сервис проверит содержимое файла. Загрузка ещё не отправляет
                  отклик бизнесу.
                </p>
              </form>
            </div>
            <aside className="panel stack">
              <h3>Точный формат файла</h3>
              <code className="csv-format">
                member_name,email,university,skills,experience_years,portfolio_url
              </code>
              <p className="field-hint">
                Обязательны первые пять колонок. portfolio_url — необязательная
                ссылка HTTP/HTTPS.
              </p>
              <ul className="recommendations">
                <li>Запятая разделяет колонки.</li>
                <li>Навыки внутри ячейки разделяются ; или |.</li>
                <li>Опыт — число от 0 до 80.</li>
                <li>Не повторяйте email и заголовки.</li>
                <li>Не добавляйте неизвестные колонки.</li>
                <li>Ячейки не должны начинаться с = + - @.</li>
                <li>UTF-8, допускается BOM.</li>
              </ul>
              <Button className="secondary" onClick={download}>
                <Download size={15} />
                Скачать шаблон
              </Button>
            </aside>
          </div>
        )
      )}
    </>
  );
}
export function CSVCheck({ id }: { id: string }) {
  const query = useSearchParams();
  const uploadId = query.get("upload_id") || "";
  const action = useAction();
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [invalidated, setInvalidated] = useState(false);
  const state = useResource(id + uploadId, async () => {
    if (!isUuid(uploadId))
      throw new ApiError(
        422,
        "upload_required",
        "Откройте результат после загрузки CSV.",
      );
    const [application, upload, result] = await Promise.all([
      applications.get(id),
      csv.get(id, uploadId),
      csv.analysis(id, uploadId).catch((error) => {
        if (
          error instanceof ApiError &&
          (error.status === 404 || error.status === 409)
        )
          return null;
        throw error;
      }),
    ]);
    return { application, upload, result };
  });
  if (!isUuid(uploadId))
    return (
      <>
        <PageHeader title="Сначала загрузите CSV" />
        <ActionLink href={"/student/applications/" + id + "/apply"}>
          Загрузить команду
        </ActionLink>
      </>
    );
  if (state.loading) return <LoadingSkeleton />;
  if (state.error)
    return (
      <>
        <ErrorNotice error={state.error} retry={state.reload} />
        <ActionLink href={"/student/applications/" + id + "/apply"}>
          Загрузить другой CSV
        </ActionLink>
      </>
    );
  if (!state.data) return null;
  const { application, upload, result } = state.data;
  const stale =
    invalidated ||
    Boolean(result && result.application_revision !== application.revision);
  const eligible = Boolean(
    result?.eligible && !stale && application.status === "published",
  );
  function analyze() {
    void action.run(
      async () => {
        const result = await csv.analyze(id, uploadId);
        const application = await applications.get(id);
        return { upload, result, application };
      },
      (value) => {
        state.setData(value);
        setInvalidated(false);
      },
      "Соответствие команды проверено.",
    );
  }
  return (
    <>
      <PageHeader
        title="Проверка команды"
        description={application.title}
        action={
          <ActionLink secondary href={"/student/applications/" + id + "/apply"}>
            Другой CSV
          </ActionLink>
        }
      />
      <ErrorNotice error={action.error} />
      <Success>{action.success}</Success>
      <div className="stack">
        <section className="panel stack">
          <div className="card-top">
            <h2>CSV прошёл проверку</h2>
            <span className="badge good">
              {upload.members.length} участников
            </span>
          </div>
          <p className="field-hint">{upload.filename}</p>
          <Members members={upload.members} />
        </section>
        {stale && (
          <div className="notice info">
            Заявка изменилась. Проверьте соответствие команды повторно.
          </div>
        )}
        {result && !stale && <MatchProgress result={result} />}
        <section className="panel stack">
          {!result || stale ? (
            <>
              <h2>Следующий шаг — соответствие проекту</h2>
              <p className="muted">
                Проверим навыки и опыт участников по требованиям заявки.
              </p>
            </>
          ) : (
            <h2>
              {eligible
                ? "Команда может отправить отклик"
                : "Команда пока не проходит требования"}
            </h2>
          )}
          <div className="actions">
            <Button
              busy={action.busy}
              disabled={application.status !== "published"}
              onClick={analyze}
            >
              <RefreshCw size={15} />
              {result ? "Проверить повторно" : "Проверить соответствие"}
            </Button>
          </div>
          {result && !result.eligible && (
            <p className="field-hint">
              Отклик не создан. Можно уточнить реальные данные команды и
              загрузить новый CSV.
            </p>
          )}
        </section>
        {eligible && (
          <form
            className="panel stack"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void action.run(
                async () => {
                  try {
                    return await responses.submit(
                      id,
                      uploadId,
                      String(data.get("message") || "").trim(),
                    );
                  } catch (error) {
                    if (
                      error instanceof ApiError &&
                      (error.status === 409 || error.status === 422)
                    )
                      setInvalidated(true);
                    throw error;
                  }
                },
                (response) =>
                  router.push(
                    "/student/responses/" + response.id + "?submitted=1",
                  ),
              );
            }}
          >
            <h2>Отправьте отклик бизнесу</h2>
            <label className="field">
              <span>Сообщение для бизнеса</span>
              <textarea
                name="message"
                maxLength={3000}
                rows={3}
                placeholder="Расскажите, почему команде интересен этот проект."
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Я подтверждаю согласие участников на передачу данных команды из
                CSV и профиля представителю бизнеса вместе с откликом.
              </span>
            </label>
            <div className="actions">
              <Button busy={action.busy} type="submit" disabled={!consent}>
                Отправить отклик
              </Button>
            </div>
            <p className="field-hint">
              Сервис повторно проверит актуальность оценки и допуск команды.
            </p>
          </form>
        )}
      </div>
    </>
  );
}
