import { requireAuth } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import CustomerNav from "@/components/customer/CustomerNav";
import CustomerMobileNav from "@/components/customer/CustomerMobileNav";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Admins should use /admin routes
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav user={user} />
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 sm:pb-8">{children}</main>
      <CustomerMobileNav />
    </div>
  );
}
