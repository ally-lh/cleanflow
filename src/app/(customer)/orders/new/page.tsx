import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import NewOrderWizard from "@/components/customer/NewOrderWizard";

export default async function NewOrderPage() {
  const user = await requireAuth();

  const customerProfile = await db.customerProfile.findUnique({
    where: { userId: user.id },
    include: { addresses: { orderBy: { isDefault: "desc" } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
        <p className="text-gray-500 mt-1">
          Tell us about your laundry and we&apos;ll take care of the rest.
        </p>
      </div>
      <NewOrderWizard addresses={customerProfile?.addresses ?? []} />
    </div>
  );
}
