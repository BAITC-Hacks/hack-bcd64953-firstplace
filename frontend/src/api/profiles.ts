import { api } from "./client";
import type { Profile, ProfileUpdate } from "@/types/api";
export const profiles = {
  get: () => api<Profile>("/profile"),
  save: (body: ProfileUpdate) =>
    api<Profile>("/profile", { method: "PUT", body }),
};
