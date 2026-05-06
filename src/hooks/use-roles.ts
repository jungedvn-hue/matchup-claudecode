import { useAuth } from "@/context/AuthContext";

export type AppRole = "master" | "player" | "host" | "court_owner" | "store_owner";

export const useRoles = (): AppRole[] => {
  const { roles } = useAuth();
  return roles;
};

export const hasRole = (roles: AppRole[], role: AppRole) =>
  roles.includes(role) || roles.includes("master");

export const useHasRole = (role: AppRole): boolean => {
  const roles = useRoles();
  return hasRole(roles, role);
};

export const useIsMaster = (): boolean => {
  const roles = useRoles();
  return roles.includes("master");
};
