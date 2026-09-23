"use client";
import { useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  UsersRound,
  X,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Brand } from "./brand";
import { Button, ErrorNotice, LoadingSkeleton } from "./ui";
import { authConfigured } from "@/config/env";
import { browserAuth } from "@/auth/browser";
import { profiles } from "@/api/profiles";
import { useResource, useAction } from "@/hooks/use-resource";
import { ProfileProvider } from "@/auth/profile-context";
import type { Role } from "@/types/api";
export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const logout = useAction();
  const state = useResource("profile", async () => {
    if (!authConfigured) return null;
    const { data, error } = await browserAuth().auth.getSession();
    if (error) throw error;
    if (!data.session) {
      router.replace("/login?next=" + encodeURIComponent(pathname));
      return null;
    }
    return profiles.get();
  });
  const profile = state.data;
  useEffect(() => {
    if (profile && profile.role !== role)
      router.replace("/" + profile.role + "/dashboard");
  }, [profile, role, router]);
  useEffect(() => {
    if (!authConfigured) return;
    const { data } = browserAuth().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  const nav = [
    ["dashboard", "Обзор", LayoutDashboard],
    [
      "applications",
      role === "business" ? "Мои заявки" : "Каталог проектов",
      role === "business" ? BriefcaseBusiness : Compass,
    ],
    [
      "responses",
      role === "business" ? "Отклики команд" : "Мои отклики",
      UsersRound,
    ],
    ["notifications", "Уведомления", Bell],
    ["profile", "Профиль", UserRound],
    ["settings", "Настройки", Settings],
  ] as const;
  return (
    <div className="workspace">
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Закрыть меню"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">
          {role === "business"
            ? "ПРОСТРАНСТВО БИЗНЕСА"
            : "ПРОСТРАНСТВО КОМАНДЫ"}
        </div>
        <nav aria-label="Основная навигация">
          {nav.map(([slug, label, Icon]) => (
            <Link
              key={slug}
              className={
                pathname.startsWith("/" + role + "/" + slug) ? "active" : ""
              }
              href={"/" + role + "/" + slug}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-orb" />
          <h3>От идеи к результату</h3>
          <p>Реальные задачи. Сильные команды. Общая цель.</p>
          <Link href="/about">
            Как это работает <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-person">
          <span className="avatar">
            {profile?.display_name?.slice(0, 1) || "S"}
          </span>
          <div>
            <strong>{profile?.display_name || "Ваш профиль"}</strong>
            <small>
              {role === "business" ? "Бизнес" : "Студенческая команда"}
            </small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace-body">
        <header className="app-header">
          <div className="header-context">
            <button
              className="icon-button mobile-only"
              aria-label="Открыть меню"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>Challenge Hub</span>
            <span className="header-divider">/</span>
            <span className="muted">
              {role === "business" ? "Бизнес" : "Студентам"}
            </span>
          </div>
          <div className="header-actions">
            <Link
              className="icon-button"
              href={"/" + role + "/notifications"}
              aria-label="Уведомления"
            >
              <Bell size={20} />
            </Link>
            <Button
              className="text-button"
              busy={logout.busy}
              onClick={() =>
                logout.run(async () => {
                  if (authConfigured) {
                    const { error } = await browserAuth().auth.signOut();
                    if (error) throw error;
                  }
                  router.replace("/login");
                })
              }
            >
              <LogOut size={17} />
              <span className="desktop-only">Выйти</span>
            </Button>
          </div>
        </header>
        <main id="main" className="workspace-content">
          <ErrorNotice error={logout.error} />
          {!authConfigured ? (
            <div className="panel config-state">
              <span className="eyebrow">ПОДКЛЮЧЕНИЕ СЕРВИСА</span>
              <h1>Требуется настройка</h1>
              <p>
                Вход и рабочее пространство станут доступны после подключения
                сервиса авторизации.
              </p>
              <p className="muted">
                Обратитесь к администратору проекта или проверьте инструкцию
                запуска.
              </p>
              <Link className="button secondary" href="/">
                На главную
              </Link>
            </div>
          ) : state.loading ? (
            <LoadingSkeleton />
          ) : state.error ? (
            <ErrorNotice error={state.error} retry={state.reload} />
          ) : profile && profile.role === role ? (
            <ProfileProvider profile={profile} reload={state.reload}>
              {children}
            </ProfileProvider>
          ) : (
            <LoadingSkeleton />
          )}
        </main>
        <footer className="app-footer">
          <span>AI Sana Challenge Hub</span>
          <Link href="/about">
            О платформе <Plus size={12} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
