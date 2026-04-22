import { useMemo } from "react";

export type AppRole = "player" | "host" | "court_owner" | "store_owner";

export const useRoles = (): AppRole[] => {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem("pickleplay_roles");
      if (raw) return JSON.parse(raw) as AppRole[];
      // Fallback: old single-role format
      const legacy = localStorage.getItem("pickleplay_account_type");
      if (legacy) return [legacy as AppRole];
    } catch {}
    return ["player"]; // default
  }, []);
};

export const hasRole = (roles: AppRole[], role: AppRole) => roles.includes(role);
