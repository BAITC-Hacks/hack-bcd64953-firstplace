# AI Sana Challenge Hub — frontend

Новый самостоятельный frontend: Next.js App Router, React, строгий TypeScript, Tailwind CSS, Supabase Auth и typed fetch.
Папка: `D:\HackAlemAI\hack-bcd64953-firstplace\frontend`. Корневой Vite-прототип не используется.

## Запуск

Node.js 22+ (проверено с 24.19.0), pnpm 11.19.0.

```powershell
Set-Location D:\HackAlemAI\hack-bcd64953-firstplace\frontend
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Заполните публичные Supabase URL/anon key в .env.local.
pnpm dev
```

Откройте http://localhost:3000. После изменения NEXT_PUBLIC_* перезапустите dev-сервер; production требует новой сборки.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Без Supabase приложение собирается и отображает публичные страницы и понятное сообщение настройки на защищённых маршрутах. При недоступном API показывается ошибка с повтором. Фиктивного входа, ИИ или успешных API-ответов в приложении нет. DEMO_MODE=false; демонстрационный адаптер не реализован.

## Подключение backend

Авторитетный источник: `hack-bcd64953-firstplace-feature-backend.zip`, только `backend/`.
Локальной backend-папки на момент реализации не было. ZIP не распаковывался поверх репозитория, его static frontend не использовался.

1. Ответственный за backend отдельно запускает FastAPI на :8000 и настраивает Supabase, приватный Storage, миграции и ИИ.
2. В frontend/.env.local укажите NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY. Никаких service-role или AI ключей.
3. Разрешите origin http://localhost:3000 в backend CORS.
4. В Supabase Auth разрешите redirect http://localhost:3000/auth/callback (включая query-параметры) и Site URL http://localhost:3000. JWT backend поддерживает ES256/RS256.
5. Зарегистрируйте бизнес и студента через интерфейс, подтвердите почту и создайте backend-профили. Роль после создания неизменна.
6. Когда доступен настоящий OpenAPI, выполните:

```powershell
pnpm generate:api
pnpm typecheck
pnpm build
```

Скрипт читает OPENAPI_SCHEMA_URL из окружения/.env.local, создаёт src/types/api.generated.ts через openapi-typescript и переключает src/types/api.ts на generated aliases. Сейчас типы в api.source.ts честно отмечены source-derived из Pydantic-схем ZIP.

Подтверждение email поддерживает PKCE code exchange и token_hash + type. Для подтверждения на другом устройстве используйте Supabase email template с token_hash, например маршрут /auth/callback?token_hash={{ .TokenHash }}&type=email. Восстановление направляется через callback к /reset-password; у token_hash-ссылки укажите type=recovery.

## Браузерные контрактные тесты

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location).Path '.cache\ms-playwright'
node node_modules/@playwright/test/cli.js install chromium
pnpm test:e2e
```

Playwright сам запускает приложение на :3100 и изолированный тестовый HTTP fixture на :8011. Данные и токены синтетические, состояние только в памяти. Этот fixture находится в tests/, не импортируется приложением и не является вторым production backend. Тесты не подтверждают работу реальных Supabase/Storage/ИИ. Нужны свободные порты 3100 и 8011.

HTML-отчёт: playwright-report/index.html. Скриншоты: test-results/. Они исключены из Git.

## Основные правила

- Роль берётся из GET /profile. JWT metadata/localStorage не используются для прикладных прав.
- Cookie-based Supabase browser/server clients и proxy refresh. FastAPI проверяет каждый Bearer-запрос.
- На 401 клиент обновляет сессию один раз; затем требует вход. На profile_required открывает onboarding.
- Готовность, matching, eligible и threshold приходят от сервиса. Публикация только при readiness_score=100.
- Вопросы и оценки привязаны к revision. Старые ответы/оценки требуют повторного анализа.
- CSV: multipart file, Content-Type формирует браузер. Локально проверяются только расширение/размер/пустота; содержимое проверяет backend.
- Upload → matching → отдельная отправка отклика. Перед отправкой есть согласие на передачу данных участников бизнесу.
- Решение бизнеса: только status. Нет decision comment и auto_rejected.
- Уведомления запрашиваются обычным GET. Отметка прочтения — PATCH отдельного уведомления.
- Пароли не сохраняются приложением. Сессией управляет официальный Supabase SSR SDK; CSV/контакты не сохраняются в demo storage.

## Маршруты и контракт

Полный список — docs/routes.md. Детали и ограничения — docs/integration.md.
Рекомендуемый ручной commit: `feat(frontend): build AI Sana Next.js app against new backend contract`.

## Документация библиотек

- [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Tailwind CSS для Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)

Next.js 16 использует proxy.ts. Tailwind 4 подключён через @tailwindcss/postcss и CSS import.
TypeScript 5.9 / ESLint 9 выбраны из-за peer ranges текущих next-eslint и openapi-typescript.
