import {
  getAdminDashboardStats,
  getAdminOrdersAction,
  getPendingPickupsAction,
} from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SERVICE_TYPE_LABELS } from "@/types/constants";

export default async function AdminDashboardPage() {
  const [stats, recentOrders, pendingPickups] = await Promise.all([
    getAdminDashboardStats(),
    getAdminOrdersAction(),
    getPendingPickupsAction(),
  ]);

  const recentFive = recentOrders.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-SG", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: stats.totalOrders, color: "text-gray-900" },
          { label: "Pending Pickup", value: stats.pendingPickup, color: "text-amber-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Ready for Collection", value: stats.readyForCollection, color: "text-green-600" },
          { label: "Completed Today", value: stats.completedToday, color: "text-purple-600" },
          { label: "Awaiting Billing Confirm", value: stats.pendingBillingConfirmation, color: "text-red-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Pickups */}
      {pendingPickups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Pickup Requests
              <Badge variant="destructive" className="ml-2">{pendingPickups.length}</Badge>
            </h2>
            <Link href="/admin/schedule"><Button variant="outline" size="sm">View all</Button></Link>
          </div>
          <div className="space-y-3">
            {pendingPickups.slice(0, 3).map((pickup) => (
              <Card key={pickup.id} className="border-amber-200">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {pickup.order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pickup.order.customer.user.name} ·{" "}
                      {new Date(pickup.requestedDate).toLocaleDateString("en-SG")} ·{" "}
                      {pickup.requestedSlot}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pickup.address.streetLine1}, {pickup.address.postalCode}
                    </p>
                  </div>
                  <Link href={`/admin/orders/${pickup.orderId}`}><Button size="sm">Review</Button></Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders"><Button variant="outline" size="sm">View all</Button></Link>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentFive.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.customer.user.name} · {SERVICE_TYPE_LABELS[order.serviceType]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {order.invoice
                        ? `SGD ${(order.invoice.finalTotal ?? order.invoice.estimatedTotal).toFixed(2)}`
                        : "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-SG")}
                    </p>
                  </div>
                </Link>
              ))}
              {recentFive.length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">
                  No orders yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
