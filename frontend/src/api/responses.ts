import { api, type Query } from "./client";
import type { ProjectResponse, Page, Role, Team } from "@/types/api";
export const responses = {
  list: (role: Role, query: Query = {}) =>
    api<Page<ProjectResponse>>(`/${role}/responses`, { query }),
  forApplication: (id: string, query: Query = {}) =>
    api<Page<ProjectResponse>>(`/applications/${id}/responses`, { query }),
  get: (id: string) => api<ProjectResponse>(`/responses/${id}`),
  submit: (id: string, upload_id: string, message: string) =>
    api<ProjectResponse>(`/applications/${id}/responses`, {
      method: "POST",
      body: { upload_id, message },
    }),
  decide: (id: string, status: "accepted" | "rejected") =>
    api<ProjectResponse>(`/responses/${id}/decision`, {
      method: "PATCH",
      body: { status },
    }),
  team: (id: string) => api<Team>(`/business/teams/${id}`),
};
