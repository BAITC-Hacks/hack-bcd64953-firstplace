"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { profiles } from "@/api/profiles";
import { ApiError } from "@/api/client";
import { browserAuth } from "@/auth/browser";
import { authConfigured } from "@/config/env";
import { roleDestination } from "@/validators/navigation";
import { useAction, useResource } from "@/hooks/use-resource";
import { useProfile } from "@/auth/profile-context";
import {
  Button,
  ErrorNotice,
  Success,
  PageHeader,
  LoadingSkeleton,
} from "./ui";
import type { Profile, Role } from "@/types/api";
export const parseSkills = (value: string) =>
  value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
export function ProfileForm({
  initial,
  onSaved,
  preferred = "student",
}: {
  initial: Profile | null;
  onSaved: (profile: Profile) => void;
  preferred?: Role;
}) {
  const [role, setRole] = useState<Role>(initial?.role || preferred);
  const action = useAction();
  return (
    <form
      className="panel stack profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const field = (name: string) => String(data.get(name) || "").trim();
        void action.run(
          () =>
            profiles.save({
              ...(initial ? {} : { role }),
              display_name: field("display_name"),
              ...(role === "business"
                ? {
                    business: {
                      organization_name: field("organization_name"),
                      description: field("description"),
                      contacts: field("contacts"),
                    },
                  }
                : {
                    student: {
                      team_name: field("team_name"),
                      university: field("university"),
                      skills: parseSkills(field("skills")),
                      experience: field("experience"),
                      portfolio_url: field("portfolio_url") || null,
                    },
                  }),
            }),
          onSaved,
          "Профиль сохранён.",
        );
      }}
    >
      <ErrorNotice error={action.error} />
      <Success>{action.success}</Success>
      {initial ? (
        <p className="field-hint">
          Роль: {role === "business" ? "Бизнес" : "Студенческая команда"}. Роль
          фиксируется при создании профиля.
        </p>
      ) : (
        <fieldset>
          <legend className="field-hint">
            Кто вы? После создания профиля роль изменить нельзя.
          </legend>
          <div className="role-picker">
            <label className="role-option">
              <input
                type="radio"
                name="role"
                checked={role === "business"}
                onChange={() => setRole("business")}
              />
              Бизнес
            </label>
            <label className="role-option">
              <input
                type="radio"
                name="role"
                checked={role === "student"}
                onChange={() => setRole("student")}
              />
              Команда
            </label>
          </div>
        </fieldset>
      )}
      <label className="field">
        <span>Ваше имя</span>
        <input
          name="display_name"
          required
          maxLength={200}
          defaultValue={initial?.display_name}
          autoComplete="name"
        />
      </label>
      {initial && (
        <p className="field-hint">Подтверждённая почта: {initial.email}</p>
      )}
      {role === "business" ? (
        <>
          <label className="field">
            <span>Название организации</span>
            <input
              name="organization_name"
              maxLength={200}
              defaultValue={initial?.business?.organization_name}
            />
          </label>
          <label className="field">
            <span>Об организации</span>
            <textarea
              name="description"
              maxLength={5000}
              defaultValue={initial?.business?.description}
            />
          </label>
          <label className="field">
            <span>Контакты для связи</span>
            <textarea
              name="contacts"
              maxLength={1000}
              defaultValue={initial?.business?.contacts}
            />
          </label>
        </>
      ) : (
        <>
          <div className="grid-two">
            <label className="field">
              <span>Название команды</span>
              <input
                name="team_name"
                maxLength={200}
                defaultValue={initial?.student?.team_name}
              />
            </label>
            <label className="field">
              <span>Университет</span>
              <input
                name="university"
                maxLength={200}
                defaultValue={initial?.student?.university}
              />
            </label>
          </div>
          <label className="field">
            <span>Навыки через запятую</span>
            <input
              name="skills"
              defaultValue={initial?.student?.skills.join(", ")}
              placeholder="Python, SQL, NLP"
            />
            <small>До 100 навыков, каждый до 80 символов.</small>
          </label>
          <label className="field">
            <span>Опыт команды</span>
            <textarea
              name="experience"
              maxLength={5000}
              defaultValue={initial?.student?.experience}
            />
          </label>
          <label className="field">
            <span>Ссылка на портфолио</span>
            <input
              name="portfolio_url"
              type="url"
              pattern="https?://.*"
              defaultValue={initial?.student?.portfolio_url || ""}
              placeholder="https://…"
            />
          </label>
        </>
      )}
      <div className="actions">
        <Button type="submit" busy={action.busy}>
          {initial ? "Сохранить изменения" : "Создать профиль"}
        </Button>
      </div>
    </form>
  );
}
export function Onboarding() {
  const router = useRouter();
  const query = useSearchParams();
  const next = query.get("next");
  const state = useResource("onboarding", async () => {
    if (!authConfigured) return null;
    const { data } = await browserAuth().auth.getSession();
    if (!data.session) {
      router.replace(
        "/login?next=" + encodeURIComponent(next || "/complete-profile"),
      );
      return null;
    }
    try {
      return await profiles.get();
    } catch (error) {
      if (error instanceof ApiError && error.code === "profile_required")
        return null;
      throw error;
    }
  });
  return (
    <main
      id="main"
      className="standalone"
      style={{ maxWidth: 850, marginTop: 45 }}
    >
      <PageHeader
        title={state.data ? "Ваш профиль" : "Завершите знакомство"}
        description="Выберите роль и расскажите о себе. Это поможет начать работу."
      />
      {!authConfigured ? (
        <div className="notice info">
          Сервис временно недоступен / требуется настройка авторизации.
        </div>
      ) : state.loading ? (
        <LoadingSkeleton />
      ) : state.error ? (
        <ErrorNotice error={state.error} retry={state.reload} />
      ) : (
        <ProfileForm
          initial={state.data}
          preferred={next?.startsWith("/business/") ? "business" : "student"}
          onSaved={(profile) => {
            router.replace(roleDestination(profile.role, next));
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
export function ProfilePage() {
  const { profile, reload } = useProfile();
  return (
    <>
      <PageHeader
        title="Профиль"
        description="Информация о вас и вашей организации или команде."
      />
      <ProfileForm
        key={profile.updated_at}
        initial={profile}
        onSaved={reload}
      />
    </>
  );
}
