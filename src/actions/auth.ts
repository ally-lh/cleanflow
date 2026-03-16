"use server";

import { signIn, signOut } from "@/lib/auth/config";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";

// ──────────────────────────────────────────
// VALIDATION SCHEMAS
// ──────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ──────────────────────────────────────────
// ACTION TYPES
// ──────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ──────────────────────────────────────────
// REGISTER
// ──────────────────────────────────────────

export async function registerAction(
  formData: FormData
): Promise<ActionResult<{ email: string }>> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, password, phone } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "CUSTOMER",
      customerProfile: {
        create: { phone: phone ?? null },
      },
    },
  });

  return { success: true, data: { email } };
}

// ──────────────────────────────────────────
// LOGIN (delegates to NextAuth)
// ──────────────────────────────────────────

export async function loginAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid email or password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: "Invalid email or password." };
    }
    throw err;
  }
}

// ──────────────────────────────────────────
// LOGOUT
// ──────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
