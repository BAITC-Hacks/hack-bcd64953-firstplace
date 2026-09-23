import { api } from "./client";
import type { CSVUpload, MatchResult } from "@/types/api";
export const csv = {
  upload: (id: string, file: File) => {
    const body = new FormData();
    body.set("file", file);
    return api<CSVUpload>(`/applications/${id}/csv`, { method: "POST", body });
  },
  get: (id: string, upload: string) =>
    api<CSVUpload>(`/applications/${id}/csv/${upload}`),
  analyze: (id: string, upload: string) =>
    api<MatchResult>(`/applications/${id}/csv/${upload}/analyze`, {
      method: "POST",
    }),
  analysis: (id: string, upload: string) =>
    api<MatchResult>(`/applications/${id}/csv/${upload}/analysis`),
};
