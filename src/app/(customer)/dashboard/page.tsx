import { getMyOrdersAction } from "@/actions/orders";
import { requireAuth } from "@/lib/auth/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { ORDER_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/constants";
import { WashingMachine } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth();
  const orders = await getMyOrdersAction();

  const activeOrders = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  const pastOrders = orders.filter(
    (o) => o.status === "COMPLETED" || o.status === "CANCELLED"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.name?.split(" ")[0]}!
          </h1>
          <p className="text-gray-500 mt-1">
            {activeOrders.length > 0
              ? `You have ${activeOrders.length} active order${activeOrders.length > 1 ? "s" : ""}.`
              : "No active orders right now."}
          </p>
        </div>
        <Link href="/orders/new"><Button>New Order</Button></Link>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Active Orders</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <WashingMachine className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No orders yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              Place your first order — upload a photo of your laundry and our AI
              will estimate the count and cost.
            </p>
            <Link href="/orders/new"><Button>Place first order</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Order History</h2>
          <div className="space-y-3">
            {pastOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// ORDER CARD COMPONENT (inline, page-specific)
// ──────────────────────────────────────────

function OrderCard({ order }: { order: Awaited<ReturnType<typeof getMyOrdersAction>>[number] }) {
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const total = order.invoice?.finalTotal ?? order.invoice?.estimatedTotal;

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex items-center justify-between py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500">
              {SERVICE_TYPE_LABELS[order.serviceType]} ·{" "}
              {itemCount > 0 ? `${itemCount} items` : "Items pending"} ·{" "}
              {new Date(order.createdAt).toLocaleDateString("en-SG")}
            </p>
          </div>
          <div className="text-right">
            {total ? (
              <p className="font-semibold text-gray-900">
                SGD {total.toFixed(2)}
              </p>
            ) : (
              <p className="text-sm text-gray-400">Est. pending</p>
            )}
            <p className="text-xs text-gray-400">
              {ORDER_STATUS_LABELS[order.status]}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
