"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Sparkles, ShoppingBag, UserRound } from "lucide-react";

const tabs = [
  { href: "/dashboard", basePath: "/dashboard", label: "Home", icon: Home },
  { href: "/orders/new", basePath: "/orders/new", label: "Clean", icon: Sparkles },
  { href: "/rent", basePath: "/rent", label: "Rent", icon: ShoppingBag },
  { href: "/profile", basePath: "/profile", label: "Profile", icon: UserRound },
];

export default function CustomerMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur sm:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto grid max-w-4xl grid-cols-4 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.basePath || pathname.startsWith(`${tab.basePath}/`);

          return (
            <li key={tab.label}>
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-xl px-2 py-1 text-[11px] font-medium leading-tight transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
