"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/types/constants";
import { cn } from "@/lib/utils";
import { WashingMachine } from "lucide-react";

interface Props {
  user: { name?: string | null; email?: string | null; role?: string | null };
}

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default function AdminNav({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-700">
        <WashingMachine className="w-5 h-5 text-blue-400 mr-2" />
        <span className="font-bold">{APP_NAME}</span>
        <span className="ml-auto text-xs text-gray-500 uppercase">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate">{user.name}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
        <form action={logoutAction} className="mt-3">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-white hover:bg-gray-700"
          >
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
