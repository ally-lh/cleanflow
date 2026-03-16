import { getAdminOrdersAction } from "@/actions/admin";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SERVICE_TYPE_LABELS } from "@/types/constants";
import { OrderStatus } from "@prisma/client";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status as OrderStatus | undefined;
  const search = sp.search;

  const orders = await getAdminOrdersAction({ status, search });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          All Orders
          <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
        </h1>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", status: undefined },
          { label: "Pending Pickup", status: "PENDING_PICKUP_SCHEDULING" },
          { label: "In Progress", status: "WASHING" },
          { label: "Ready", status: "READY_FOR_COLLECTION" },
          { label: "Completed", status: "COMPLETED" },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.status ? `/admin/orders?status=${f.status}` : "/admin/orders"}
          >
            <Badge
              variant={status === f.status || (!status && !f.status) ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
            >
              {f.label}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Orders list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-gray-600">
                    {order.customer.user.name} · {order.customer.user.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {SERVICE_TYPE_LABELS[order.serviceType]} ·{" "}
                    {order.items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-SG")}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-gray-900">
                    {order.invoice
                      ? `SGD ${(order.invoice.finalTotal ?? order.invoice.estimatedTotal).toFixed(2)}`
                      : "—"}
                  </p>
                  {order.invoice && (
                    <Badge
                      variant={
                        order.invoice.status === "CONFIRMED" ? "default" : "outline"
                      }
                      className="text-xs"
                    >
                      {order.invoice.status.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-500 py-12 text-sm">
                No orders found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
