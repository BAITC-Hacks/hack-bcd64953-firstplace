import fs from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const url =
  process.env.OPENAPI_SCHEMA_URL || "http://localhost:8000/openapi.json";
const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error("OpenAPI request failed: " + response.status);
const schema = await response.json();
const names = schema.components?.schemas || {};
const aliases = {
  Profile: "Profile",
  ProfileUpdate: "ProfileUpdate",
  BusinessDetails: "BusinessDetails",
  StudentDetails: "StudentDetails",
  Application: "Application",
  ApplicationCreate: "ApplicationCreate",
  ApplicationAnalysis: "ApplicationAnalysis",
  Answers: "Answers",
  Question: "Question",
  Readiness: "Readiness",
  TeamMember: "TeamMember",
  CSVUpload: "CSVUpload",
  MatchResult: "MatchResult",
  Team: "Team",
  ProjectResponse: "Response",
  Notification: "Notification",
};
for (const target of Object.values(aliases))
  if (!names[target]) throw new Error("Missing backend schema " + target);
const pageName = Object.keys(names).find(
  (name) =>
    name.startsWith("Page_") &&
    name.includes("Application") &&
    !name.includes("Analysis"),
);
if (!pageName) throw new Error("Missing application page schema");
const generated = astToString(await openapiTS(schema));
let facade = "import type { components } from './api.generated';\n";
for (const [alias, target] of Object.entries(aliases))
  facade +=
    "export type " + alias + " = components['schemas']['" + target + "'];\n";
facade += `export type Role = Profile['role'];
export type ApplicationStatus = Application['status'];
export type ResponseStatus = ProjectResponse['status'];
export type QuestionField = Question['field'];
export type ApplicationFields = Pick<Application,'title'|'description'|'goal'|'target_audience'|'expected_result'|'timeline'|'available_data'|'success_criteria'|'required_skills'|'min_experience_years'>;
export type ApplicationUpdate = Partial<ApplicationFields>;
export type Timestamps = Pick<Application,'created_at'|'updated_at'>;
export type Page<T> = Omit<components['schemas']['${pageName}'],'items'> & {items:T[]};
`;
await fs.writeFile("src/types/api.generated.ts", generated);
await fs.writeFile("src/types/api.ts", facade);
console.log(
  "Generated api.generated.ts and switched api.ts to OpenAPI aliases. Run pnpm typecheck.",
);
