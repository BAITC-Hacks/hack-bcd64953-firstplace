# AI Sana Challenge Hub — backend

Отдельный REST API: Python **3.14.7**, FastAPI, Pydantic 2, Supabase Auth/PostgreSQL/Storage.
Frontend не изменён. В рабочем дереве он статический (HTML/CSS/JS), без API-вызовов.

## Запуск

Из папки `backend/`, с установленным Python 3.14.7:

```powershell
py -3.14 -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
Copy-Item .env.example .env
# Заполните .env, затем:
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000 --no-access-log
```

С uv: `uv sync --frozen --extra dev`, затем `uv run uvicorn app.main:app --reload --port 8000`.
Версия Python зафиксирована в `.python-version` и `pyproject.toml`; зависимости имеют точные
версии, полное дерево находится в `uv.lock`.

- Swagger: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- OpenAPI: <http://localhost:8000/openapi.json>
- Health: <http://localhost:8000/api/v1/health>

Без ключей доступны документация и health. Рабочие функции возвращают ошибку конфигурации,
а не демонстрационные данные. Health проверяет процесс, не внешние сервисы.

## Supabase

1. Включите Email Auth, настройте Site URL и Redirect URLs frontend для подтверждения почты
   и восстановления пароля. Регистрация/вход/refresh выполняются непосредственно через Supabase Auth.
2. Выберите асимметричный ключ **ES256 или RS256**. Legacy HS256 этим сервером не поддерживается.
3. Примените по порядку SQL из `supabase/migrations/` через Supabase SQL Editor или ваш процесс
   миграций. Это новая прикладная схема: сначала проверьте отсутствие одноимённых таблиц.
   Удалённые миграции автоматически не запускались.
4. Заполните `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   Issuer/JWKS автоматически выводятся из URL, если соответствующие настройки пустые.
5. Миграция создаёт приватный бакет `team-csv`, лимит 5 MiB. Не открывайте его публично.

После регистрации frontend вызывает `PUT /api/v1/profile` с access_token и выбирает роль
один раз. Дальше роль неизменна и читается из БД. JWT metadata не определяет бизнес-права.
Email берётся из проверенного JWT; после изменения email обновите сессию и сохраните профиль.

Для текущего Live Server добавьте в `.env`:

```dotenv
EXTRA_CORS_ORIGINS=["http://127.0.0.1:5500","http://localhost:5500"]
```

## ИИ и CSV

`AI_BASE_URL` — корень API, совместимого с `/chat/completions` и structured output
`response_format.type=json_schema`, обычно URL с `/v1`. Укажите AI_API_KEY и AI_MODEL своего
провайдера. Запросы реальные, с таймаутом и валидацией ответа, без фиктивного fallback.
ИИ составляет вопросы и рекомендации; проценты рассчитывает сервер. CSV не отправляется ИИ.

CSV: UTF-8 (BOM допустим), запятая между колонками, 1–50 участников, до 5 MiB.
Обязательные колонки: `member_name,email,university,skills,experience_years`.
Необязательная: `portfolio_url` (HTTP/HTTPS). Навыки через `;` или `|`, опыт — число 0–80.
Примеры: `examples/valid-team.csv`, `examples/invalid-team.csv`.
Запрещены дубликаты email/заголовков, пустые обязательные поля, неизвестные колонки и формулы.
Перед отправкой отклика frontend должен объяснить передачу данных участников бизнесу.

Готовность — заполненность девяти полей; публикация при 100%. Соответствие — 85 баллов за
навыки + 15 за опыт, округление вниз; отправка от 90%. Это оценка заявленных данных команды,
не независимая проверка квалификации. Эти правила дополняют оборванное ТЗ и описаны в архитектуре.

## Проверки

```powershell
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check app tests
.venv\Scripts\python -m ruff format --check app tests
.venv\Scripts\python -m mypy app
```

SQL-проверка: `cd tests/sql`, `npm install`, `npm test`. Она выполняет реальные миграции
и PL/pgSQL в PGlite с минимальными фикстурами Supabase-owned auth/storage.
Hosted Auth/Storage и внешний ИИ требуют отдельных проверок с реальными ключами.

## Эксплуатация

Секреты хранятся только в `.env`/переменных окружения. API не выдаёт JWT, ключи, входные
значения ошибок или сообщения провайдера. Логи: request_id, метод, статус и длительность.
Лимит тела применяется до multipart-парсинга. На reverse proxy настройте HTTPS, таймауты,
rate limiting и квоты ИИ/CSV: ограничения частоты внутри процесса не реализованы.
Удаление аккаунтов/старых CSV требует отдельного административного процесса: каскады БД
не удаляют объекты Storage. При ошибке сохранения metadata сервер пытается удалить загруженный файл;
после неоднозначного сетевого сбоя нужна сверка файлов и metadata.

Docker: `docker build -t ai-sana-backend .`,
`docker run --env-file .env -p 8000:8000 ai-sana-backend`.
Подробнее: [API_CONTRACT.md](API_CONTRACT.md), [ARCHITECTURE.md](ARCHITECTURE.md),
[DATABASE.md](DATABASE.md).
