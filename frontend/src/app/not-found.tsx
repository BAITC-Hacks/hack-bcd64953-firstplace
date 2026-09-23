import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="standalone">
      <span className="eyebrow">404 / AI SANA</span>
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь на главную.</p>
      <Link className="button" href="/">
        На главную
      </Link>
    </main>
  );
}
