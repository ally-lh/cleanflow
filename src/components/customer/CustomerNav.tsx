"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/types/constants";
import { cn } from "@/lib/utils";
import { WashingMachine, Sparkles, Shirt, LucideIcon, ShoppingBag } from "lucide-react";

interface Props {
  user: { name?: string | null; email?: string | null };
}

interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "My Orders" },
  { href: "/orders/new", label: "New Order" },
  { href: "/catalog", label: "Rental", icon: Shirt },
  { href: "/style", label: "Style AI", icon: Sparkles },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/profile", label: "Profile" },
];

export default function CustomerNav({ user }: Props) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
            <WashingMachine className="w-5 h-5 text-blue-600" />
            {APP_NAME}
          </Link>
          <nav className="hidden sm:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm transition-colors flex items-center gap-1",
                  pathname === link.href
                    ? "text-blue-600 font-medium"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">
            {user.name ?? user.email}
          </span>
        </div>
      </div>
    </header>
  );
}
