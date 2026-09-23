"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock3,
  Building2,
} from "lucide-react";
import type { Application, Readiness, Role } from "@/types/api";
import { Badge, dateText, statusLabels } from "./ui";
export const fieldLabels: Record<string, string> = {
  title: "Название",
  description: "Описание задачи",
  goal: "Цель проекта",
  target_audience: "Целевая аудитория",
  expected_result: "Ожидаемый результат",
  timeline: "Сроки",
  available_data: "Доступные данные",
  success_criteria: "Критерии успеха",
  required_skills: "Необходимые навыки",
};
export function ReadinessProgress({
  score,
  readiness,
}: {
  score: number;
  readiness?: Readiness;
}) {
  return (
    <section className="readiness" aria-label="Готовность заявки">
      <div className="readiness-head">
        <span>ГОТОВНОСТЬ ЗАЯВКИ</span>
        <strong>{score}%</strong>
      </div>
      <progress
        value={score}
        max={100}
        aria-label={"Готовность " + score + " процентов"}
      />
      <p>
        {score === 100
          ? "Все обязательные поля заполнены. Можно перейти к публикации."
          : "Для публикации необходимо заполнить все обязательные поля — до 100%."}
      </p>
      {readiness && (
        <ul className="readiness-list">
          {readiness.filled_fields.map((field) => (
            <li key={field} className="filled">
              <CheckCircle2 size={13} />
              {fieldLabels[field] || field}
            </li>
          ))}
          {readiness.missing_fields.map((field) => (
            <li key={field}>
              <Circle size={13} />
              {fieldLabels[field] || field} — не заполнено
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function ApplicationCard({
  application: a,
  role,
}: {
  application: Application;
  role: Role;
}) {
  return (
    <article className="application-card">
      <div className="card-top">
        <span className="organization">
          <span className="avatar">
            <Building2 size={14} />
          </span>
          {a.organization_name || "Организация"}
        </span>
        <Badge tone={a.status}>{statusLabels[a.status]}</Badge>
      </div>
      <h2>
        <Link href={"/" + role + "/applications/" + a.id}>
          {a.title || "Заявка без названия"}
        </Link>
      </h2>
      <p>{a.description}</p>
      <div className="skill-list">
        {a.required_skills.slice(0, 5).map((skill) => (
          <span key={skill} className="skill">
            {skill}
          </span>
        ))}
        {a.required_skills.length > 5 && (
          <span className="skill">+{a.required_skills.length - 5}</span>
        )}
      </div>
      <div className="card-meta">
        {a.timeline && (
          <span>
            <Clock3 size={12} />
            {a.timeline.slice(0, 70)}
          </span>
        )}
        <span>Опыт от {a.min_experience_years} лет</span>
      </div>
      <div className="card-bottom">
        <span className="muted">
          {role === "business" && a.status === "draft"
            ? "Готовность " + a.readiness_score + "%"
            : dateText(a.created_at)}
        </span>
        <Link href={"/" + role + "/applications/" + a.id}>
          Подробнее <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  );
}
export function ApplicationContent({
  application: a,
}: {
  application: Application;
}) {
  return (
    <section className="panel">
      <div className="card-top">
        <span className="organization">
          <Building2 size={15} />
          {a.organization_name || "Организация"}
        </span>
        <Badge tone={a.status}>{statusLabels[a.status]}</Badge>
      </div>
      <h2 className="detail-title" style={{ marginTop: 22 }}>
        {a.title || "Заявка без названия"}
      </h2>
      {(
        [
          "description",
          "goal",
          "target_audience",
          "expected_result",
          "timeline",
          "available_data",
          "success_criteria",
        ] as const
      ).map((field) => (
        <div key={field} className="detail-section">
          <h3>{fieldLabels[field]}</h3>
          <p>{a[field] || "Пока не указано"}</p>
        </div>
      ))}
      <div className="detail-section">
        <h3>Необходимые навыки</h3>
        <div className="skill-list">
          {a.required_skills.length ? (
            a.required_skills.map((skill) => (
              <span key={skill} className="skill">
                {skill}
              </span>
            ))
          ) : (
            <p>Пока не указаны</p>
          )}
        </div>
      </div>
      <div className="detail-section">
        <h3>Минимальный опыт участника</h3>
        <p>{a.min_experience_years} лет</p>
      </div>
      <div className="detail-section card-meta">
        <span>Создана {dateText(a.created_at)}</span>
        <span>Обновлена {dateText(a.updated_at)}</span>
        <span>Версия {a.revision}</span>
      </div>
    </section>
  );
}
export function FlowSteps({ step }: { step: number }) {
  return (
    <nav className="stepper" aria-label="Создание заявки">
      {[
        "01 · Идея",
        "02 · Анализ и ответы",
        "03 · Предпросмотр",
        "04 · Публикация",
      ].map((label, index) => (
        <span
          key={label}
          className={index === step ? "current" : ""}
          aria-current={index === step ? "step" : undefined}
        >
          {label}
        </span>
      ))}
    </nav>
  );
}
