"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="standalone">
      <h1>Не удалось открыть страницу</h1>
      <p>Попробуйте ещё раз.</p>
      <button className="button" onClick={reset}>
        Повторить
      </button>
    </main>
  );
}
