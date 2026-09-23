# Реализованные маршруты

## Публичные и Auth

- /
- /about
- /login
- /register
- /forgot-password
- /reset-password
- /complete-profile
- /auth/callback (Route Handler)

## Бизнес

- /business/dashboard
- /business/applications
- /business/applications/create
- /business/applications/[id]
- /business/applications/[id]/edit
- /business/applications/[id]/ai-analysis
- /business/applications/[id]/preview
- /business/applications/[id]/responses
- /business/responses
- /business/responses/[id]
- /business/teams/[id]
- /business/notifications
- /business/profile
- /business/settings

## Студенты

- /student/dashboard
- /student/applications
- /student/applications/[id]
- /student/applications/[id]/apply
- /student/applications/[id]/csv-check?upload_id=UUID
- /student/responses
- /student/responses/[id]
- /student/notifications
- /student/profile
- /student/settings

UUID-параметры проверяются на маршрутах. Неизвестные страницы имеют 404, ошибки рендера — error boundary.
Защищённые данные загружаются после авторизации и получения роли из backend profile.
