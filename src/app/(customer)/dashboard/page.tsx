import { getMyOrdersAction } from "@/actions/orders";
import { requireAuth } from "@/lib/auth/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { ORDER_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/constants";
import { ArrowRight, CalendarClock, PackageCheck, Shirt, Sparkles } from "lucide-react";

type ActiveRental = {
  id: string;
  itemName: string;
  returnDate: string;
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const orders = await getMyOrdersAction();
  const activeRentals: ActiveRental[] = [];

  const activeOrders = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/70 bg-card/90 py-0 shadow-sm">
        <CardHeader className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
              Hello, {user.name?.split(" ")[0] ?? "there"}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              Plan your laundry, rent outfits, and keep track of everything in one place.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeOrders.length} ongoing order{activeOrders.length === 1 ? "" : "s"}
            </div>
            <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeRentals.length} ongoing rental{activeRentals.length === 1 ? "" : "s"}
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-2 rounded-2xl border-border/70 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-2">
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Schedule Laundry</CardTitle>
            <CardDescription>
              Book pickup and let us handle washing, ironing, and delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end px-5 pt-0 pb-5">
            <Link href="/orders/new" className="inline-flex">
              <Button className="rounded-xl">
                Start Laundry Order
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="gap-2 rounded-2xl border-border/70 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-2">
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/15 text-chart-2">
              <Shirt className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Rent Clothes</CardTitle>
            <CardDescription>
              Browse curated looks and get AI suggestions for your event.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end px-5 pt-0 pb-5">
            <Link href="/rent" className="inline-flex">
              <Button variant="outline" className="rounded-xl">
                Browse Rentals
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/70 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 py-5">
            <CardTitle className="text-lg">Ongoing Orders</CardTitle>
            <CardDescription>Track your active laundry orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {activeOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-5 text-center">
                <PackageCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No ongoing orders right now.</p>
              </div>
            ) : (
              activeOrders.slice(0, 3).map((order) => (
                <CompactOrderCard key={order.id} order={order} />
              ))
            )}

            <Link href="/orders/new" className="inline-flex">
              <Button variant="ghost" className="rounded-xl px-0 text-primary hover:text-primary/80">
                Schedule new laundry
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 py-5">
            <CardTitle className="text-lg">Ongoing Rentals</CardTitle>
            <CardDescription>Manage your currently rented outfits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {activeRentals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-5 text-center">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active rentals yet.</p>
              </div>
            ) : (
              activeRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="rounded-xl border border-border/70 bg-background/80 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">{rental.itemName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Return by {rental.returnDate}</p>
                </div>
              ))
            )}

            <Link href="/rent" className="inline-flex">
              <Button variant="ghost" className="rounded-xl px-0 text-primary hover:text-primary/80">
                Browse rental catalog
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {recentOrders.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <CompactOrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CompactOrderCard({
  order,
}: {
  order: Awaited<ReturnType<typeof getMyOrdersAction>>[number];
}) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = order.invoice?.finalTotal ?? order.invoice?.estimatedTotal;

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="rounded-xl border-border/70 bg-background/75 py-0 transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {SERVICE_TYPE_LABELS[order.serviceType]} · {itemCount > 0 ? `${itemCount} items` : "Items pending"}
            </p>
          </div>
          <div className="text-right">
            {total ? (
              <p className="text-sm font-semibold text-foreground">SGD {total.toFixed(2)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Est. pending</p>
            )}
            <p className="text-[11px] text-muted-foreground">{ORDER_STATUS_LABELS[order.status]}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
