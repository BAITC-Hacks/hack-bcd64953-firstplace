import Link from "next/link";
import { Brand } from "./brand";
export function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav className="public-nav" aria-label="Навигация">
        <Link href="/login?next=/business/applications/create">Бизнесу</Link>
        <Link href="/login?next=/student/applications">Студентам</Link>
        <Link href="/about">О платформе</Link>
      </nav>
      <div className="public-auth">
        <Link href="/login">Войти</Link>
        <Link className="button" href="/register">
          Присоединиться ↗
        </Link>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <Brand />
      <span>Идеи, которым нужна команда.</span>
      <Link href="/about">О платформе ↗</Link>
    </footer>
  );
}
