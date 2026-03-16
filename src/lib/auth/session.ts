// Helpers for getting the current session in server components and actions

import { auth } from "./config";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Redirects to /login if not authenticated */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to /dashboard if not an admin */
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export function isAdmin(role?: UserRole | string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
