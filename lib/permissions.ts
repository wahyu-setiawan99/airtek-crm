import type { Role } from "@/types/crm";

export function canWrite(role: Role) {
  return role !== "viewer";
}

export function canManage(role: Role) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canAdmin(role: Role) {
  return role === "owner" || role === "admin";
}

export function canEditOwned(role: Role, userId: string, ownerId: string | null) {
  if (!canWrite(role)) return false;
  if (canManage(role)) return true;
  return ownerId === userId;
}
