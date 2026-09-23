begin;

alter table public.student_profiles
  add column if not exists contacts jsonb not null default '{}'::jsonb
  check (jsonb_typeof(contacts) = 'object');

create function public.readiness_score(p_data jsonb) returns integer
language sql immutable set search_path = public, pg_temp as $$
  select (case when length(btrim(p_data->>'title')) > 0 then 5 else 0 end)
       + (case when length(btrim(p_data->>'description')) > 0 then 10 else 0 end)
       + (case when length(btrim(p_data->>'goal')) > 0 then 15 else 0 end)
       + (case when length(btrim(p_data->>'target_audience')) > 0 then 10 else 0 end)
       + (case when length(btrim(p_data->>'expected_result')) > 0 then 15 else 0 end)
       + (case when length(btrim(p_data->>'timeline')) > 0 then 10 else 0 end)
       + (case when length(btrim(p_data->>'available_data')) > 0 then 10 else 0 end)
       + (case when length(btrim(p_data->>'success_criteria')) > 0 then 15 else 0 end)
       + (case when jsonb_array_length(p_data->'required_skills') > 0 then 10 else 0 end);
$$;

create function public.save_profile(p_user_id uuid, p_email text, p_role text, p_data jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare p public.profiles; details jsonb;
begin
  select * into p from public.profiles where user_id = p_user_id for update;
  if found and p.role <> p_role then
    raise exception 'Role is immutable' using errcode = '23514';
  end if;
  if p.id is null then
    insert into public.profiles(user_id, role, display_name, email, avatar_url)
    values (p_user_id, p_role, p_data->>'display_name', p_email, p_data->>'avatar_url')
    returning * into p;
  else
    update public.profiles set display_name = p_data->>'display_name', email = p_email,
      avatar_url = case when p_data ? 'avatar_url' then p_data->>'avatar_url' else avatar_url end
      where id = p.id returning * into p;
  end if;
  if p_role = 'business' then
    insert into public.business_profiles(profile_id) values (p.id) on conflict do nothing;
    if jsonb_typeof(p_data->'business') = 'object' then
      update public.business_profiles set
        organization_name = coalesce(p_data->'business'->>'organization_name', organization_name),
        description = coalesce(p_data->'business'->>'description', description),
        contacts = coalesce(p_data->'business'->>'contacts', contacts) where profile_id = p.id;
    end if;
    select to_jsonb(b) - 'id' - 'profile_id' into details
      from public.business_profiles b where profile_id = p.id;
  else
    insert into public.student_profiles(profile_id) values (p.id) on conflict do nothing;
    if jsonb_typeof(p_data->'student') = 'object' then
      update public.student_profiles set
        team_name = coalesce(p_data->'student'->>'team_name', team_name),
        university = coalesce(p_data->'student'->>'university', university),
        skills = case when jsonb_typeof(p_data->'student'->'skills') = 'array' then
          array(select jsonb_array_elements_text(p_data->'student'->'skills')) else skills end,
        experience = coalesce(p_data->'student'->>'experience', experience),
        portfolio_url = case when p_data->'student' ? 'portfolio_url'
          then p_data->'student'->>'portfolio_url' else portfolio_url end,
        contacts = case when jsonb_typeof(p_data->'student'->'contacts') = 'object'
          then p_data->'student'->'contacts' else contacts end
        where profile_id = p.id;
    end if;
    select to_jsonb(s) - 'id' - 'profile_id' into details
      from public.student_profiles s where profile_id = p.id;
  end if;
  return to_jsonb(p) || jsonb_build_object(p_role, details);
end;
$$;

create function public.validate_application() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.profiles where id = new.business_id and role = 'business') then
    raise exception 'Business profile required' using errcode = '42501';
  end if;
  new.readiness_score = public.readiness_score(to_jsonb(new));
  if new.status = 'published' and new.readiness_score < 80 then
    raise exception 'Application readiness must be at least 80%%' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger applications_validate before insert or update on public.applications
for each row execute function public.validate_application();

create function public.mutate_application(p_id uuid, p_owner uuid, p_revision integer, p_changes jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare a public.applications; changed public.applications;
begin
  select * into a from public.applications where id = p_id and business_id = p_owner for update;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if a.revision <> p_revision then
    raise exception 'Stale application' using errcode = '40001';
  end if;
  if p_changes ? 'status' then
    if not ((a.status = 'draft' and p_changes->>'status' = 'published')
          or (a.status = 'published' and p_changes->>'status' = 'closed')) then
      raise exception 'Invalid transition' using errcode = '23514';
    end if;
    if (p_changes - 'status') <> '{}'::jsonb then
      raise exception 'Status changes cannot edit content' using errcode = '23514';
    end if;
  elsif a.status <> 'draft' then
    raise exception 'Only drafts are editable' using errcode = '23514';
  end if;
  changed = jsonb_populate_record(a, p_changes);
  update public.applications set title = changed.title, description = changed.description,
    goal = changed.goal, target_audience = changed.target_audience,
    expected_result = changed.expected_result, timeline = changed.timeline,
    available_data = changed.available_data, success_criteria = changed.success_criteria,
    required_skills = changed.required_skills, min_experience_years = changed.min_experience_years,
    status = changed.status, revision = a.revision + 1 where id = a.id returning * into a;
  return to_jsonb(a);
end;
$$;

create function public.save_application_analysis(p_owner uuid, p_data jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare a public.applications; result public.application_analyses; q jsonb;
begin
  select * into a from public.applications where id = (p_data->>'application_id')::uuid
    and business_id = p_owner for update;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if a.status <> 'draft' or a.revision <> (p_data->>'application_revision')::int then
    raise exception 'Stale analysis' using errcode = '40001';
  end if;
  insert into public.application_analyses
    select * from jsonb_populate_record(null::public.application_analyses, p_data)
    returning * into result;
  for q in select * from jsonb_array_elements(p_data->'questions') loop
    insert into public.application_questions(id, analysis_id, application_id, field, question)
    values ((q->>'id')::uuid, result.id, a.id, q->>'field', q->>'question');
  end loop;
  return to_jsonb(result);
end;
$$;

create function public.answer_application_questions(p_owner uuid, p_analysis_id uuid,
  p_revision integer, p_changes jsonb, p_answers jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare analysis public.application_analyses; submitted_answer jsonb; result jsonb;
begin
  select * into analysis from public.application_analyses where id = p_analysis_id;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if analysis.application_revision <> p_revision then
    raise exception 'Stale analysis' using errcode = '40001';
  end if;
  result = public.mutate_application(analysis.application_id, p_owner, p_revision, p_changes);
  for submitted_answer in select * from jsonb_array_elements(p_answers) loop
    update public.application_questions set answer = submitted_answer->>'answer'
      where id = (submitted_answer->>'question_id')::uuid and analysis_id = p_analysis_id;
    if not found then raise exception 'Invalid question' using errcode = '23514'; end if;
  end loop;
  update public.application_analyses set
    questions = (select jsonb_agg(jsonb_build_object('id', q.id, 'field', q.field,
      'question', q.question, 'answer', q.answer) order by q.field)
      from public.application_questions q where q.analysis_id = p_analysis_id),
    application_revision = (result->>'revision')::int,
    readiness = jsonb_build_object('score', (result->>'readiness_score')::int,
      'filled_fields', coalesce((select jsonb_agg(k) from unnest(array['title','description','goal',
        'target_audience','expected_result','timeline','available_data','success_criteria',
        'required_skills']) k where case when k = 'required_skills' then
        jsonb_array_length(result->k) > 0 else length(btrim(result->>k)) > 0 end), '[]'::jsonb),
      'missing_fields', coalesce((select jsonb_agg(k) from unnest(array['title','description','goal',
        'target_audience','expected_result','timeline','available_data','success_criteria',
        'required_skills']) k where case when k = 'required_skills' then
        jsonb_array_length(result->k) = 0 else length(btrim(result->>k)) = 0 end), '[]'::jsonb))
    where id = p_analysis_id;
  return result;
end;
$$;

create function public.save_match_evaluation(p_data jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare a public.applications; result public.ai_evaluations;
begin
  select * into a from public.applications where id = (p_data->>'application_id')::uuid for update;
  if not found or a.status <> 'published' or a.revision <> (p_data->>'application_revision')::int then
    raise exception 'Stale application' using errcode = '40001';
  end if;
  if not exists (select 1 from public.csv_uploads u join public.profiles p on p.id = u.student_id
    where u.id = (p_data->>'upload_id')::uuid and u.application_id = a.id
      and u.student_id = (p_data->>'student_id')::uuid and p.role = 'student') then
    raise exception 'Not found' using errcode = 'P0002';
  end if;
  insert into public.ai_evaluations
    select * from jsonb_populate_record(null::public.ai_evaluations, p_data)
    on conflict (upload_id, application_revision) do nothing;
  select * into result from public.ai_evaluations where upload_id = (p_data->>'upload_id')::uuid
    and application_revision = a.revision;
  return to_jsonb(result);
end;
$$;

create function public.submit_response(p_application uuid, p_student uuid, p_upload uuid,
  p_threshold integer, p_message text) returns jsonb language plpgsql
set search_path = public, pg_temp as $$
declare a public.applications; e public.ai_evaluations; result public.responses;
begin
  select * into a from public.applications where id = p_application for update;
  if not found or a.status <> 'published' then
    raise exception 'Application unavailable' using errcode = '23514';
  end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'Student required' using errcode = '42501';
  end if;
  select * into e from public.ai_evaluations where upload_id = p_upload
    and application_id = p_application and student_id = p_student
    and application_revision = a.revision for share;
  if not found or not e.eligible or e.score < greatest(90, p_threshold) then
    raise exception 'Matching threshold not met' using errcode = '23514';
  end if;
  insert into public.responses(application_id, student_id, upload_id, evaluation_id, message)
    values(p_application, p_student, p_upload, e.id, p_message) returning * into result;
  insert into public.notifications(profile_id, title, body, link)
    values (a.business_id, 'Новый отклик команды', 'Команда откликнулась на заявку «' || a.title || '».',
      '/business/applications/' || a.id || '/responses');
  return to_jsonb(result);
end;
$$;

create function public.decide_response(p_id uuid, p_business uuid, p_status text)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare r public.responses;
begin
  select r0.* into r from public.responses r0 join public.applications a on a.id = r0.application_id
    where r0.id = p_id and a.business_id = p_business for update of r0;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if p_status not in ('accepted', 'rejected') then
    raise exception 'Invalid decision' using errcode = '23514';
  end if;
  if r.status = p_status then return to_jsonb(r); end if;
  if r.status <> 'pending' then
    raise exception 'Decision already made' using errcode = '23514';
  end if;
  update public.responses set status = p_status, decided_at = now() where id = p_id returning * into r;
  insert into public.notifications(profile_id, title, body, link)
    values (r.student_id, case when p_status = 'accepted' then 'Отклик принят' else 'Отклик отклонён' end,
      'Бизнес рассмотрел отклик вашей команды.', '/student/responses/' || r.id);
  return to_jsonb(r);
end;
$$;

revoke all on function public.readiness_score(jsonb), public.validate_application(),
  public.save_profile(uuid,text,text,jsonb), public.mutate_application(uuid,uuid,integer,jsonb),
  public.save_application_analysis(uuid,jsonb),
  public.answer_application_questions(uuid,uuid,integer,jsonb,jsonb),
  public.save_match_evaluation(jsonb), public.submit_response(uuid,uuid,uuid,integer,text),
  public.decide_response(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.readiness_score(jsonb), public.validate_application(),
  public.save_profile(uuid,text,text,jsonb), public.mutate_application(uuid,uuid,integer,jsonb),
  public.save_application_analysis(uuid,jsonb),
  public.answer_application_questions(uuid,uuid,integer,jsonb,jsonb),
  public.save_match_evaluation(jsonb), public.submit_response(uuid,uuid,uuid,integer,text),
  public.decide_response(uuid,uuid,text) to service_role;

commit;
