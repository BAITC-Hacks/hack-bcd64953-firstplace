# Интеграция и границы проверки

Авторитетный snapshot: backend из прикреплённого hack-bcd64953-firstplace-feature-backend.zip.
Прочитаны API_CONTRACT.md, ARCHITECTURE.md, README.md, .env.example, routes, Pydantic schemas; дополнительно сверены ошибки сервисов.
Локальная backend-папка отсутствовала; сравнивать две реализации не потребовалось. localhost:8000/openapi.json был недоступен.
Backend, SQL, root Vite, ветка и Git history не изменялись.

## API-модули

| Модуль           | Подключённые действия                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| profiles.ts      | GET/PUT profile, onboarding и редактирование                                             |
| applications.ts  | каталог, собственные заявки, создание, PATCH, analyze, analysis, answers, publish, close |
| csv.ts           | POST multipart file, GET upload, POST analyze, GET analysis                              |
| responses.ts     | отправка, списки, подробности, команда, PATCH decision                                   |
| notifications.ts | список с unread_only/limit/offset, PATCH is_read                                         |
| client.ts        | единая база, Bearer, один refresh, timeout, structured errors, X-Request-ID              |

Все JSON-поля snake_case. Управляемые сервером поля не передаются при создании/редактировании/отклике.
Реальные фильтры каталога: search, skill, sort, limit, offset. Бизнес: search, status, limit, offset.
Статистика использует total из обычных списков. Дополнительных stats/settings API нет.

## Состояния

Draft → published при 100% → closed. Черновик редактируется вручную или ответами с исходными question_id.
После ручной правки UI сравнивает revision и application_revision. Ошибка 409 при ответах предлагает повторный анализ.
CSV upload сохраняет только server upload_id в URL, не содержимое в browser storage.
Оценка сравнивается с текущей revision; отклик отправляется только при eligible=true, актуальной версии и published.
Backend повторно проверяет eligibility. 409/422 скрывают отправку до повторной оценки.
Отклики: pending → accepted/rejected. Решения и закрытие имеют native dialog с фокусом, Escape и подтверждением.
Несколько команд могут быть приняты. Решение не содержит комментариев.

## Ошибки и безопасность интерфейса

Проверены ветви 401, 403 profile_required/роль, 404, 409, 413, 422, 429, 500, 502, 503, 504, timeout/offline, non-JSON.
Сообщения backend отображаются только из bounded error envelope без stack/provider fragments. Request ID показывается для поддержки.
Вход, signup, подтверждение email, recovery, смена пароля, refresh, signOut используют Supabase Auth.
App Router pages остаются Server Components; интерактивные формы и рабочее пространство используют Client Components.
Данные профиля/заявок не читаются напрямую из Supabase DB. API клиента обращается только в FastAPI.
Произвольный HTML не рендерится. Portfolio URLs ограничены HTTP/HTTPS, redirect paths — локальными путями своей роли.

## Типы

src/types/api.source.ts — временные source-derived типы из backend/app/schemas/*.py; это НЕ generated.
src/types/api.ts — facade для API и компонентов.
scripts/generate-api.mjs извлекает реальную OpenAPI schema, использует openapi-typescript и меняет facade на generated aliases.
Если OpenAPI недоступен, генератор завершается с ошибкой, не подменяя типы фиктивной схемой.

## Что требует реального окружения

- Реальные signup/login/email confirmation/recovery и доставка писем.
- Backend JWT/JWKS с ES256/RS256 и серверный профиль/роль.
- Supabase DB + применённые backend миграции, private team-csv Storage.
- Доступный настроенный AI provider для живых вопросов.
- CSV parsing, persistence, транзакции и реальная математика backend.
- End-to-end между двумя настоящими пользователями.

Без этих сервисов UI показывает состояние ошибки/настройки, а не fake success.
DEMO_MODE default false; demo adapter не реализован. Fixtures используются исключительно автоматическими тестами.
