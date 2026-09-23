import { api, type Query } from "./client";
import type {
  Application,
  ApplicationAnalysis,
  ApplicationCreate,
  ApplicationUpdate,
  Answers,
  Page,
} from "@/types/api";
export const applications = {
  catalog: (query: Query) => api<Page<Application>>("/applications", { query }),
  own: (query: Query) =>
    api<Page<Application>>("/business/applications", { query }),
  get: (id: string) => api<Application>(`/applications/${id}`),
  create: (body: ApplicationCreate) =>
    api<Application>("/applications", { method: "POST", body }),
  update: (id: string, body: ApplicationUpdate) =>
    api<Application>(`/applications/${id}`, { method: "PATCH", body }),
  analyze: (id: string) =>
    api<ApplicationAnalysis>(`/applications/${id}/analyze`, {
      method: "POST",
      timeoutMs: 90000,
    }),
  analysis: (id: string) =>
    api<ApplicationAnalysis>(`/applications/${id}/analysis`),
  answers: (id: string, body: Answers) =>
    api<Application>(`/applications/${id}/answers`, { method: "POST", body }),
  publish: (id: string) =>
    api<Application>(`/applications/${id}/publish`, { method: "POST" }),
  close: (id: string) =>
    api<Application>(`/applications/${id}/close`, { method: "POST" }),
};
