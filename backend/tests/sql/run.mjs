import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
let count = 0;
function check(value) { assert.ok(value); count++; }
async function rejects(sql, args, code) {
  await assert.rejects(db.query(sql, args), e => e.code === code); count++;
}
async function rpc(name, args) {
  const params = args.map((_, i) => `$${i + 1}`).join(',');
  return (await db.query(`select public.${name}(${params}) v`, args)).rows[0].v;
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create schema storage; create table storage.buckets(id text primary key,name text,
    public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).sort()) await db.exec(await readFile(new URL(file, dir),'utf8'));
  check((await db.query("select count(*)::int n from pg_tables where schemaname='public' and rowsecurity")).rows[0].n === 10);
  check(!(await db.query("select public from storage.buckets where id='team-csv'")).rows[0].public);
  const users = [randomUUID(),randomUUID(),randomUUID()];
  for (const id of users) await db.query('insert into auth.users values ($1)',[id]);
  await db.exec('set role service_role');
  const b = await rpc('save_profile',[users[0],'b@example.com','business',{display_name:'Business'}]);
  const s = await rpc('save_profile',[users[1],'s@example.com','student',{display_name:'Student',student:{team_name:'Team'}}]);
  const other = await rpc('save_profile',[users[2],'o@example.com','business',{display_name:'Other'}]);
  check(s.student.team_name === 'Team');
  await rejects('select public.save_profile($1,$2,$3,$4)',[users[1],'s@example.com','business',{display_name:'Escalation'}],'23514');
  let app = (await db.query(`insert into applications(business_id,title,description)
    values($1,'Project','A sufficiently long description') returning *`,[b.id])).rows[0];
  check(app.readiness_score === 15);
  await rejects('select public.mutate_application($1,$2,$3,$4)',[app.id,b.id,app.revision,{status:'published'}],'23514');
  await rejects('select public.mutate_application($1,$2,$3,$4)',[app.id,other.id,app.revision,{title:'Stolen'}],'P0002');
  const aid = randomUUID(), qid = randomUUID();
  await rpc('save_application_analysis',[b.id,{id:aid,application_id:app.id,application_revision:app.revision,
    summary:'Clarify',recommendations:[],questions:[{id:qid,field:'goal',question:'What is your goal?',answer:null}],
    readiness:{score:15,filled_fields:['title','description'],missing_fields:['goal']},created_at:new Date().toISOString()}]);
  app = await rpc('answer_application_questions',[b.id,aid,app.revision,{goal:'Useful prototype'},[{question_id:qid,answer:'Useful prototype'}]]);
  check(app.goal === 'Useful prototype' && app.readiness_score === 30);
  const analysis = (await db.query('select * from application_analyses where id=$1',[aid])).rows[0];
  check(analysis.questions[0].answer === app.goal && analysis.application_revision === app.revision);
  await rejects('select public.mutate_application($1,$2,$3,$4)',[app.id,b.id,1,{title:'Stale'}],'40001');
  app = await rpc('mutate_application',[app.id,b.id,app.revision,{target_audience:'Students',expected_result:'Prototype',
    timeline:'4 weeks',available_data:'Public data',success_criteria:'90%',required_skills:['Python']}]);
  check(app.readiness_score === 100);
  app = await rpc('mutate_application',[app.id,b.id,app.revision,{status:'published'}]);
  check(app.status === 'published');
  await rejects('select public.mutate_application($1,$2,$3,$4)',[app.id,b.id,app.revision,{title:'Change'}],'23514');
  const uid = randomUUID();
  await db.query(`insert into csv_uploads(id,application_id,student_id,filename,storage_path,size_bytes,members)
    values($1,$2,$3,'team.csv',$4,100,$5)`,[uid,app.id,s.id,`${s.id}/${uid}.csv`,[{member_name:'Ayan',skills:['Python']}]]);
  const evaluation = {id:randomUUID(),upload_id:uid,application_id:app.id,student_id:s.id,application_revision:app.revision,
    score:89,threshold:90,eligible:false,matched_skills:['python'],missing_skills:[],experience_score:4,
    explanation:'Gap',created_at:new Date().toISOString()};
  await rpc('save_match_evaluation',[evaluation]);
  await rejects('select public.submit_response($1,$2,$3,$4,$5)',[app.id,s.id,uid,0,'Bypass'],'23514');
  // Adjust trusted service-role fixture to exercise success after the rejected score.
  await db.query('update ai_evaluations set score=94,eligible=true where id=$1',[evaluation.id]);
  const response = await rpc('submit_response',[app.id,s.id,uid,90,'We can help']);
  check(response.status === 'pending');
  await rejects('select public.submit_response($1,$2,$3,$4,$5)',[app.id,s.id,uid,90,'Duplicate'],'23505');
  check((await db.query('select count(*)::int n from notifications where profile_id=$1',[b.id])).rows[0].n === 1);
  await rejects('select public.decide_response($1,$2,$3)',[response.id,other.id,'accepted'],'P0002');
  check((await rpc('decide_response',[response.id,b.id,'accepted'])).status === 'accepted');
  await rpc('decide_response',[response.id,b.id,'accepted']);
  check((await db.query('select count(*)::int n from notifications where profile_id=$1',[s.id])).rows[0].n === 1);
  await rejects('select public.decide_response($1,$2,$3)',[response.id,b.id,'rejected'],'23514');
  await rpc('mutate_application',[app.id,b.id,app.revision,{status:'closed'}]);
  await rejects('select public.submit_response($1,$2,$3,$4,$5)',[app.id,s.id,uid,90,'Closed'],'23514');
  await rejects('select public.save_match_evaluation($1)',[evaluation],'40001');
  await db.exec('reset role; set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[1]]);
  const rows = (await db.query('select user_id from profiles')).rows;
  check(rows.length === 1 && rows[0].user_id === users[1]);
  await rejects('select * from responses',[],'42501');
  await rejects('select * from csv_uploads',[],'42501');
  await rejects('select public.submit_response($1,$2,$3,$4,$5)',[app.id,s.id,uid,0,'Browser bypass'],'42501');
  await db.exec('reset role; set role anon');
  await rejects('select * from profiles',[],'42501');
  console.log(`SQL checks passed: ${count}. Migrations, transactions and RLS.`);
} finally { await db.close(); }
