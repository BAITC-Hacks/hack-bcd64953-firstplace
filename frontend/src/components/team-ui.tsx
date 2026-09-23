"use client";
import { ExternalLink } from "lucide-react";
import type { Team, TeamMember, MatchResult } from "@/types/api";
import { httpUrl } from "@/validators/navigation";
import { Badge } from "./ui";
export function Members({ members }: { members: TeamMember[] }) {
  return (
    <div className="member-grid">
      {members.map((member, index) => (
        <article className="member" key={member.email + index}>
          <h3>{member.member_name}</h3>
          <p>{member.university}</p>
          <p>{member.email}</p>
          <div className="skill-list">
            {member.skills.map((skill) => (
              <span className="skill" key={skill}>
                {skill}
              </span>
            ))}
          </div>
          <p>Опыт: {member.experience_years} лет</p>
          {httpUrl(member.portfolio_url) && (
            <a
              href={httpUrl(member.portfolio_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Портфолио <ExternalLink size={11} style={{ display: "inline" }} />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
export function TeamCard({ team }: { team: Team }) {
  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">СТУДЕНЧЕСКАЯ КОМАНДА</p>
        <h2>{team.student.team_name || team.display_name}</h2>
        <p className="muted">{team.student.university}</p>
      </div>
      <div className="skill-list">
        {team.student.skills.map((skill) => (
          <span key={skill} className="skill">
            {skill}
          </span>
        ))}
      </div>
      {team.student.experience && (
        <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
          {team.student.experience}
        </p>
      )}
      {httpUrl(team.student.portfolio_url) && (
        <a
          className="text-button"
          href={httpUrl(team.student.portfolio_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Портфолио команды <ExternalLink size={14} />
        </a>
      )}
      <h3>Участники из CSV</h3>
      <Members members={team.members} />
    </section>
  );
}
export function MatchProgress({ result }: { result: MatchResult }) {
  return (
    <section className="panel stack">
      <div className="card-top">
        <span className="eyebrow">СООТВЕТСТВИЕ ПРОЕКТУ</span>
        <Badge tone={result.eligible ? "good" : "rejected"}>
          {result.eligible ? "Порог пройден" : "Ниже порога"}
        </Badge>
      </div>
      <div className="match-score">
        {result.score}
        <small> / 100</small>
      </div>
      <progress
        value={result.score}
        max={100}
        aria-label={"Соответствие " + result.score + " процентов"}
      />
      <p className="field-hint">
        Порог для отклика: {result.threshold}%. Оценка для версии заявки{" "}
        {result.application_revision}.
      </p>
      <p className="muted">{result.explanation}</p>
      <div className="grid-two">
        <div>
          <h3>Совпавшие навыки</h3>
          <div className="skill-list" style={{ marginTop: 12 }}>
            {result.matched_skills.length ? (
              result.matched_skills.map((skill) => (
                <Badge tone="good" key={skill}>
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="field-hint">Нет совпадений</p>
            )}
          </div>
        </div>
        <div>
          <h3>Недостающие навыки</h3>
          <div className="skill-list" style={{ marginTop: 12 }}>
            {result.missing_skills.length ? (
              result.missing_skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))
            ) : (
              <p className="field-hint">Все необходимые навыки указаны</p>
            )}
          </div>
        </div>
      </div>
      <p className="field-hint">
        Компонент опыта: {result.experience_score} из 15 баллов. Проверка
        учитывает точные навыки и заявленный опыт участников; семантический
        ИИ-анализ не используется.
      </p>
    </section>
  );
}
