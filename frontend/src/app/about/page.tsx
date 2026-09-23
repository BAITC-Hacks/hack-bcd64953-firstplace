import { PublicHeader, PublicFooter } from "@/components/public-layout";
import { ActionLink } from "@/components/ui";
export default function About() {
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main" className="about-content">
        <p className="eyebrow">О ПЛАТФОРМЕ</p>
        <h1>
          Реальная задача.
          <br />
          Общая точка роста.
        </h1>
        <p className="muted">
          AI Sana Challenge Hub соединяет бизнес и студенческие команды через
          понятные проектные задачи.
        </p>
        <div className="grid-two">
          <section className="panel">
            <h2>Для бизнеса</h2>
            <p>
              Опишите проблему, ответьте на уточняющие вопросы ИИ и заполните
              все необходимые поля. При готовности 100% заявку можно
              опубликовать. Смотрите состав команд и принимайте решения по
              откликам.
            </p>
          </section>
          <section className="panel">
            <h2>Для студентов</h2>
            <p>
              Выберите проект в каталоге, загрузите CSV с участниками и
              проверьте соответствие. Если команда проходит установленный порог,
              отправьте отдельный отклик и следите за решением.
            </p>
          </section>
        </div>
        <section className="panel">
          <h2>Понятные правила</h2>
          <p>
            Готовность отражает заполненность заявки. ИИ помогает формулировать
            вопросы и рекомендации, но не выставляет проценты. Соответствие
            команды учитывает точное совпадение навыков и заявленный опыт. Это
            не независимая проверка квалификации.
          </p>
          <p>
            Перед отправкой отклика вы подтверждаете передачу данных участников
            бизнесу. Несколько команд могут быть приняты на один проект.
          </p>
        </section>
        <div className="actions">
          <ActionLink href="/register?next=/business/applications/create">
            Я представляю бизнес
          </ActionLink>
          <ActionLink href="/register?next=/student/applications" secondary>
            Мы студенческая команда
          </ActionLink>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
