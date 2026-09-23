# PostgreSQL

Применить по порядку `supabase/migrations/202609230001_schema.sql` и
`202609230002_transactions.sql` к новой прикладной схеме Supabase. Миграции одноразовые,
транзакционные; не запускайте их повторно поверх существующих одноимённых объектов.

| Таблица | Назначение |
|---|---|
| profiles | Уникальный user_id -> auth.users; неизменные role/user_id, имя, email, аватар, даты |
| business_profiles | Уникальный profile_id; организация, описание, контакты |
| student_profiles | Уникальный profile_id; команда, вуз, skills[], experience, portfolio_url |
| applications | business_id, содержание проекта, навыки/опыт, готовность, status, revision |
| application_analyses | Версия заявки, summary, recommendations, questions, readiness |
| application_questions | Вопросы/ответы; unique(analysis_id, field) |
| csv_uploads | student_id, application_id, приватный storage_path, размер, имя, members JSONB |
| ai_evaluations | Оценки CSV; unique(upload_id, application_revision); score, threshold, explanation |
| responses | Заявка, студент, CSV, оценка, статус; unique(application_id, student_id) |
| notifications | Владелец, заголовок, текст, относительная ссылка, is_read, дата |

UUID и timestamptz используются везде, проект Supabase должен работать в UTC.
Индексы покрывают владельцев, статусы каталога, навыки и уведомления.
Team ID в API — profiles.id студента, не auth.users.id.
Обрыв списка student_profiles дополнен portfolio_url; участники находятся в снимке CSV отклика.
Название ai_evaluations сохранено из архитектуры, но оценка детерминированная.

RLS включён на всех таблицах. authenticated имеет SELECT только собственного profiles;
прикладные DML/RPC разрешены service_role. RPC SECURITY INVOKER, фиксированный search_path,
PUBLIC EXECUTE отозван. Бакет team-csv приватный, лимит 5 MiB, MIME text/csv.

Секреты/JWT/пароли здесь не хранятся. Публичного API удаления аккаунта нет; для удаления
связанных записей и объектов Storage нужен административный процесс с политикой хранения.
