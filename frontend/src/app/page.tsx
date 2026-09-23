import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileText,
  GraduationCap,
  Layers3,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-layout";
export default function Home() {
  return (
    <div className="landing">
      <PublicHeader />
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-tag">
              <i /> БИЗНЕС + СТУДЕНТЫ + ИИ
            </div>
            <h1>
              Превращаем бизнес-идеи в <em>понятные проекты</em> для
              студенческих команд
            </h1>
            <p className="hero-description">
              Вашему бизнесу нужен новый взгляд. Вашей команде — реальная
              задача. AI Sana помогает встретиться и начать работу.
            </p>
            <div className="actions">
              <Link
                className="button"
                href="/login?next=/business/applications/create"
              >
                Создать заявку <ArrowRight size={15} />
              </Link>
              <Link
                className="button secondary"
                href="/login?next=/student/applications"
              >
                Найти проект <ArrowRight size={15} />
              </Link>
            </div>
            <p className="hero-caption">
              <ShieldCheck size={14} /> От первого описания до осознанного
              выбора команды
            </p>
          </div>
          <div
            className="hero-visual"
            aria-label="Иллюстрация: идея превращается в структурированный проект"
          >
            <div className="orb" />
            <div className="visual-card top">
              <span className="tiny-label">
                <FileText size={12} /> С ЧЕГО ВСЁ НАЧИНАЕТСЯ
              </span>
              <h3>«Хотим лучше понимать наших клиентов»</h3>
              <p>Одна идея — множество возможностей.</p>
              <div className="lines">
                <i />
                <i />
              </div>
            </div>
            <div className="visual-card bottom">
              <span className="tiny-label">
                <Sparkles size={12} /> ВОПРОСЫ, КОТОРЫЕ ПОМОГАЮТ
              </span>
              <h3>Из идеи — в понятную задачу</h3>
              <p>Цель · Результат · Данные · Навыки</p>
              <div className="visual-check">
                <Check size={14} /> Следующий шаг становится яснее
              </div>
            </div>
            <span className="visual-note">ВАШИ ИДЕИ. ОБЩИЙ РЕЗУЛЬТАТ.</span>
          </div>
        </section>
        <div className="landing-strip">
          <div>
            <BriefcaseBusiness size={24} />
            <span>
              <strong>Реальные задачи бизнеса</strong>
              <small>От проблемы к проекту</small>
            </span>
          </div>
          <div>
            <Sparkles size={24} />
            <span>
              <strong>ИИ помогает уточнить</strong>
              <small>Вы определяете содержание</small>
            </span>
          </div>
          <div>
            <GraduationCap size={26} />
            <span>
              <strong>Команды с нужными навыками</strong>
              <small>Проверка перед откликом</small>
            </span>
          </div>
        </div>
        <section id="how-it-works" className="how-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">ПОНЯТНЫЙ ПУТЬ К СОТРУДНИЧЕСТВУ</p>
              <h2>
                Хороший проект начинается
                <br />с правильных вопросов.
              </h2>
            </div>
            <p>
              Меньше неопределённости на старте.
              <br />
              Больше пространства для совместной работы.
            </p>
          </div>
          <div className="grid-three">
            <article className="how-card">
              <span className="number">01 / БИЗНЕС</span>
              <span className="how-icon">
                <FileText size={21} />
              </span>
              <h3>Опишите задачу</h3>
              <p>
                Расскажите, что хотите улучшить. Начните с нескольких
                предложений — детали уточним дальше.
              </p>
              <Link href="/login?next=/business/applications/create">
                Создать заявку <ArrowRight size={13} />
              </Link>
            </article>
            <article className="how-card">
              <span className="number">02 / УТОЧНЕНИЕ</span>
              <span className="how-icon">
                <Layers3 size={21} />
              </span>
              <h3>Соберите ясный проект</h3>
              <p>
                Ответьте на вопросы ИИ, определите результат и необходимые
                навыки. Проверьте заявку перед публикацией.
              </p>
              <Link href="/about">
                Как это работает <ArrowRight size={13} />
              </Link>
            </article>
            <article className="how-card">
              <span className="number">03 / КОМАНДА</span>
              <span className="how-icon">
                <UsersRound size={21} />
              </span>
              <h3>Найдите друг друга</h3>
              <p>
                Команда проверяет соответствие задаче и отправляет отклик.
                Бизнес знакомится с участниками и принимает решение.
              </p>
              <Link href="/login?next=/student/applications">
                Найти проект <ArrowRight size={13} />
              </Link>
            </article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
