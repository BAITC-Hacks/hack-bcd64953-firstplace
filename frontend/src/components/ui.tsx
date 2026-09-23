"use client";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { ApiError, errorText } from "@/api/client";
export function Button({
  children,
  busy,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={"button " + className}
    >
      {busy && <LoaderCircle size={17} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={"button " + (secondary ? "secondary" : "")} href={href}>
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>{errorText(error)}</strong>
        {error instanceof ApiError && error.requestId && (
          <small>Код обращения: {error.requestId}</small>
        )}
        {retry && (
          <button className="text-button" onClick={retry}>
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}
export function Success({ children }: { children: ReactNode }) {
  return children ? (
    <div className="notice success" role="status">
      <CheckCircle2 size={20} />
      {children}
    </div>
  ) : null;
}
export function LoadingSkeleton() {
  return (
    <div className="skeleton-stack" role="status" aria-label="Загрузка">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
      <span className="sr-only">Загрузка данных…</span>
    </div>
  );
}
export function EmptyState({
  title = "Пока здесь пусто",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{children || "Данные появятся после первого действия."}</p>
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow || "AI SANA / CHALLENGE HUB"}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Pagination({
  total,
  offset,
  limit,
  onChange,
}: {
  total: number;
  offset: number;
  limit: number;
  onChange: (offset: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Страницы">
      <span>
        {total === 0
          ? "Нет результатов"
          : offset + 1 + "–" + Math.min(offset + limit, total) + " из " + total}
      </span>
      <Button
        className="secondary"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        Назад
      </Button>
      <Button
        className="secondary"
        disabled={offset + limit >= total}
        onClick={() => onChange(offset + limit)}
      >
        Далее
      </Button>
    </nav>
  );
}
export function ConfirmDialog({
  open,
  title,
  children,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="dialog-head">
        <h2 id={headingId}>{title}</h2>
        <button
          autoFocus
          className="icon-button"
          disabled={busy}
          aria-label="Закрыть"
          onClick={onCancel}
        >
          <X />
        </button>
      </div>
      <div className="muted">{children}</div>
      <div className="actions">
        <Button className="secondary" disabled={busy} onClick={onCancel}>
          Отмена
        </Button>
        <Button busy={busy} onClick={onConfirm}>
          Подтвердить
        </Button>
      </div>
    </dialog>
  );
}
export const statusLabels: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликована",
  closed: "Закрыта",
  pending: "На рассмотрении",
  accepted: "Принята",
  rejected: "Отклонена",
};
export const dateText = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
