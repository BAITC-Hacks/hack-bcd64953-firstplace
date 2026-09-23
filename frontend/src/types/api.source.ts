/** Source-derived, NOT generated. Authoritative ZIP: backend/app/schemas/*.py.
 * OpenAPI was unavailable at implementation time. See docs/integration.md. */
export type Role = "business" | "student";
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
export interface Timestamps {
  created_at: string;
  updated_at: string;
}
export interface BusinessDetails {
  organization_name: string;
  description: string;
  contacts: string;
}
export interface StudentDetails {
  team_name: string;
  university: string;
  skills: string[];
  experience: string;
  portfolio_url: string | null;
}
export interface ProfileUpdate {
  role?: Role;
  display_name: string;
  avatar_url?: string | null;
  business?: BusinessDetails;
  student?: StudentDetails;
}
export interface Profile extends Timestamps {
  id: string;
  user_id: string;
  role: Role;
  display_name: string;
  email: string;
  avatar_url: string | null;
  business: BusinessDetails | null;
  student: StudentDetails | null;
}
export type ApplicationStatus = "draft" | "published" | "closed";
export interface ApplicationFields {
  title: string;
  description: string;
  goal: string;
  target_audience: string;
  expected_result: string;
  timeline: string;
  available_data: string;
  success_criteria: string;
  required_skills: string[];
  min_experience_years: number;
}
export type ApplicationCreate = Pick<ApplicationFields, "description"> &
  Partial<Omit<ApplicationFields, "description">>;
export type ApplicationUpdate = Partial<ApplicationFields>;
export interface Application extends ApplicationFields, Timestamps {
  id: string;
  business_id: string;
  organization_name: string;
  status: ApplicationStatus;
  revision: number;
  readiness_score: number;
}
export type QuestionField =
  | "title"
  | "goal"
  | "target_audience"
  | "expected_result"
  | "timeline"
  | "available_data"
  | "success_criteria"
  | "required_skills";
export interface Question {
  id: string;
  field: QuestionField;
  question: string;
  answer: string | null;
}
export interface Readiness {
  score: number;
  filled_fields: string[];
  missing_fields: string[];
}
export interface ApplicationAnalysis {
  id: string;
  application_id: string;
  application_revision: number;
  summary: string;
  recommendations: string[];
  questions: Question[];
  readiness: Readiness;
  created_at: string;
}
export interface Answers {
  answers: { question_id: string; answer: string }[];
}
export interface TeamMember {
  member_name: string;
  email: string;
  university: string;
  skills: string[];
  experience_years: number;
  portfolio_url: string | null;
}
export interface CSVUpload {
  id: string;
  application_id: string;
  student_id: string;
  filename: string;
  members: TeamMember[];
  created_at: string;
}
export interface MatchResult {
  id: string;
  upload_id: string;
  application_id: string;
  student_id: string;
  application_revision: number;
  score: number;
  eligible: boolean;
  threshold: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_score: number;
  explanation: string;
  created_at: string;
}
export type ResponseStatus = "pending" | "accepted" | "rejected";
export interface Team {
  id: string;
  display_name: string;
  student: StudentDetails;
  members: TeamMember[];
}
export interface ProjectResponse extends Timestamps {
  id: string;
  application_id: string;
  student_id: string;
  upload_id: string;
  evaluation_id: string;
  status: ResponseStatus;
  message: string;
  decided_at: string | null;
  team: Team;
  evaluation: MatchResult;
}
export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}
