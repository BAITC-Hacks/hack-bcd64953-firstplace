# REST API v1

Base URL `http://localhost:8000/api/v1`. Swagger `/docs`, ReDoc `/redoc`, `/openapi.json`.
JSON snake_case, UUID, ISO 8601 UTC. Все бизнес-маршруты требуют
`Authorization: Bearer <supabase-access-token>`.
Списки: `{"items":[],"total":0,"limit":20,"offset":0}`; limit 1–100, offset >=0.

| Метод | Маршрут после /api/v1 | Доступ |
|---|---|---|
| GET | /health | Публичный |
| GET/PUT | /profile | Свой профиль, PUT создаёт при первом вызове |
| POST | /applications | Business, создание черновика (201) |
| GET | /business/applications | Business, свои; status/search/limit/offset |
| GET | /applications | Student, опубликованные; search/skill/sort/limit/offset |
| GET | /applications/{id} | Опубликованная или своя заявка |
| PUT/PATCH | /applications/{id} | Business-владелец, частичное изменение черновика |
| POST | /applications/{id}/analyze | Business-владелец, вопросы и рекомендации ИИ |
| GET | /applications/{id}/analysis | Business-владелец, сохранённый анализ |
| POST | /applications/{id}/answers | Business-владелец, ответы и обновление заявки |
| POST | /applications/{id}/publish | Business-владелец, готовность 100% |
| POST | /applications/{id}/close | Business-владелец |
| POST | /applications/{id}/csv | Student, multipart field file (201) |
| GET | /applications/{id}/csv/{upload_id} | Автор загрузки |
| POST | /applications/{id}/csv/{upload_id}/analyze | Автор загрузки, matching |
| GET | /applications/{id}/csv/{upload_id}/analysis | Автор загрузки, результат |
| POST | /applications/{id}/responses | Student, прошедший проверку CSV (201) |
| GET | /student/responses | Student, свои |
| GET | /business/responses | Business, свои; optional application_id |
| GET | /applications/{id}/responses | Business-владелец |
| GET | /responses/{id} | Автор или бизнес-владелец |
| PATCH | /responses/{id}/decision | Business-владелец |
| GET | /business/teams/{id} | Business, команда приславшая ему отклик |
| GET | /notifications | Свои; unread_only/limit/offset |
| PATCH | /notifications/{id} | Своё уведомление |

Поиск по title без учёта регистра, skill точный, sort newest/oldest.

## Примеры тел

Профиль бизнеса:
```json
{"role":"business","display_name":"Айдана","business":{"organization_name":"Sana Lab","contacts":"hello@example.com"}}
```
Профиль студента:
```json
{"role":"student","display_name":"Team Sana","student":{"team_name":"Team Sana","university":"KBTU","skills":["Python","SQL"],"experience":"Учебные проекты","portfolio_url":"https://example.com"}}
```
Роль фиксируется при создании; email берётся из JWT. В последующих PUT роль можно опустить.

Создание заявки (обязателен description 20–10000 символов; остальные поля позже):
```json
{"title":"Анализ обращений","description":"Нужен прототип анализа тем и тональности обращений клиентов.","goal":"Сократить ручной разбор","target_audience":"Поддержка","expected_result":"API и отчёт","timeline":"6 недель","available_data":"Обезличенные обращения","success_criteria":"F1 от 0.85","required_skills":["Python","NLP"],"min_experience_years":1}
```
PATCH/PUT принимает непустое подмножество этих полей. null и управляемые сервером
status/readiness_score/business_id запрещены. Предпросмотр — GET заявки.

Ответы:
```json
{"answers":[{"question_id":"11111111-1111-4111-8111-111111111111","answer":"Шесть недель"}]}
```
UUID из analyze; ответ required_skills — через `;` или `,`. После изменения заявки анализ
нужно повторить; устаревшая версия даёт 409.

Отклик:
```json
{"upload_id":"22222222-2222-4222-8222-222222222222","message":"Готовы обсудить проект"}
```
Последовательность upload -> analyze -> отдельная страница результата -> POST responses.
score/eligible не принимаются от клиента; eligible=false не создаёт отклик автоматически.
Ответ содержит team (участники CSV) и evaluation (оценка/объяснение).
Решение: `{"status":"accepted"}` или `{"status":"rejected"}`.
Уведомление: `{"is_read":true}`.

## Ошибки

```json
{"error":{"code":"authentication_required","message":"Требуется Bearer-токен.","details":null},"request_id":"33333333-3333-4333-8333-333333333333"}
```
401 JWT; 403 роль/profile_required; 404 чужой/неизвестный объект; 409 состояние/дубликат/версия;
413 размер; 422 входные данные/CSV/порог при отправке; 502/504 ИИ; 503 интеграция недоступна.
Ошибки валидации не отражают входные значения. Request ID также в X-Request-ID.

## Frontend

Получайте access_token через Supabase Auth и передавайте Bearer в fetch к backend.
Для CSV — FormData, Content-Type не задавайте вручную. На 401 обновляйте сессию через Auth;
на profile_required открывайте onboarding. Для регистрации/входа/reset используйте Supabase Auth.
Service role key и AI key никогда не попадают в браузер. Типы генерируются из /openapi.json.
Статистика dashboard может собираться из списков с total; отдельных контрактов настроек/статистики
в исходном ТЗ нет. Текущий frontend этим этапом не подключался и не менялся.
