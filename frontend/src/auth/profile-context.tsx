"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Profile } from "@/types/api";
const ProfileContext = createContext<{
  profile: Profile;
  reload: () => void;
} | null>(null);
export function ProfileProvider({
  profile,
  reload,
  children,
}: {
  profile: Profile;
  reload: () => void;
  children: ReactNode;
}) {
  return (
    <ProfileContext.Provider value={{ profile, reload }}>
      {children}
    </ProfileContext.Provider>
  );
}
export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("ProfileProvider is required");
  return value;
}
