import { api, type Query } from "./client";
import type { Notification, Page } from "@/types/api";
export const notifications = {
  list: (query: Query) => api<Page<Notification>>("/notifications", { query }),
  read: (id: string) =>
    api<Notification>(`/notifications/${id}`, {
      method: "PATCH",
      body: { is_read: true },
    }),
};
