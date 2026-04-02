import { getMyOrdersAction } from "@/actions/orders";
import { requireAuth } from "@/lib/auth/session";
import Link from "next/link";
import type { OrderStatus, ServiceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import DeleteDraftOrderButton from "@/components/customer/DeleteDraftOrderButton";
import PayInvoiceButton from "@/components/customer/PayInvoiceButton";
import { ORDER_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/constants";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Clock3,
  MapPinned,
  PackageCheck,
  Shirt,
  Sparkles,
  Truck,
} from "lucide-react";

type ActiveRental = {
  id: string;
  itemName: string;
  returnDate: string;
};

type CustomerOrder = Awaited<ReturnType<typeof getMyOrdersAction>>[number];
type ScheduleLane = "pickup" | "dropoff";

type ScheduleEntry = {
  id: string;
  orderId: string;
  orderNumber: string;
  lane: ScheduleLane;
  date: Date;
  slot: string;
  serviceType: ServiceType;
  status: OrderStatus;
};

const TIMETABLE_SLOTS = [
  "09:00-11:00",
  "11:00-13:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
] as const;

export default async function DashboardPage() {
  const user = await requireAuth();
  const orders = await getMyOrdersAction();
  const activeRentals: ActiveRental[] = [];

  const activeOrders = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED",
  );
  const payableOrders = orders.filter(
    (order) =>
      order.invoice?.status === "CONFIRMED" &&
      [
        "PICKUP_SCHEDULED",
        "PICKED_UP",
        "RECEIVED_AT_STORE",
        "WASHING",
        "DRYING",
        "PRESSING_OR_FINISHING",
        "READY_FOR_COLLECTION",
        "OUT_FOR_DELIVERY",
      ].includes(order.status),
  );
  const recentOrders = orders.slice(0, 3);
  const scheduleEntries = buildScheduleEntries(orders);
  const timetableDays = buildTimetableDays(scheduleEntries);
  const timetableSlots = buildTimetableSlots(scheduleEntries);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/70 bg-card/90 py-0 shadow-sm">
        <CardHeader className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
              Hello, {user.name?.split(" ")[0] ?? "there"}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              Plan your laundry, rent outfits, and keep track of everything in
              one place.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeOrders.length} ongoing order
              {activeOrders.length === 1 ? "" : "s"}
            </div>
            <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeRentals.length} ongoing rental
              {activeRentals.length === 1 ? "" : "s"}
            </div>
          </div>
        </CardHeader>
      </Card>

      {payableOrders.length > 0 && (
        <Card className="rounded-3xl border-amber-300 bg-amber-50/90 py-0 shadow-sm">
          <CardHeader className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl text-amber-950">
                    Payment required
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-amber-800">
                    Pay your confirmed invoice to keep things moving. Orders are
                    only marked completed after payment succeeds.
                  </CardDescription>
                </div>
              </div>
              <div className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-medium text-amber-900">
                {payableOrders.length} order
                {payableOrders.length === 1 ? "" : "s"} awaiting payment
              </div>
            </div>

            <div className="space-y-3">
              {payableOrders.slice(0, 2).map((order) => {
                const total =
                  order.invoice?.finalTotal ?? order.invoice?.estimatedTotal ?? 0;

                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-semibold text-foreground hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {SERVICE_TYPE_LABELS[order.serviceType]} · Amount due SGD{" "}
                        {total.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Link href={`/orders/${order.id}`} className="inline-flex">
                        <Button variant="outline" size="sm" className="rounded-xl">
                          View order
                        </Button>
                      </Link>
                      <PayInvoiceButton orderId={order.id} amount={total} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardHeader>
        </Card>
      )}

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

      <TimetableScheduleCard
        days={timetableDays}
        slots={timetableSlots}
        scheduleEntries={scheduleEntries}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/70 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 py-5">
            <CardTitle className="text-lg">Ongoing Orders</CardTitle>
            <CardDescription>Track your active laundry orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 flex flex-col gap-2">
            {activeOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-5 text-center">
                <PackageCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No ongoing orders right now.
                </p>
              </div>
            ) : (
              activeOrders
                .slice(0, 3)
                .map((order) => (
                  <CompactOrderCard key={order.id} order={order} />
                ))
            )}

            <Link href="/orders/new" className="inline-flex my-2">
              <Button
                variant="default"
                className="rounded-xl px-2 text-white hover:text-white/80"
              >
                Schedule new laundry
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90 py-0 shadow-sm">
          <CardHeader className="px-5 py-5">
            <CardTitle className="text-lg">Ongoing Rentals</CardTitle>
            <CardDescription>
              Manage your currently rented outfits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {activeRentals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-5 text-center">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No active rentals yet.
                </p>
              </div>
            ) : (
              activeRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="rounded-xl border border-border/70 bg-background/80 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {rental.itemName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Return by {rental.returnDate}
                  </p>
                </div>
              ))
            )}

            <Link href="/rent" className="inline-flex">
              <Button
                variant="default"
                className="rounded-xl text-md px-2 text-white hover:text-white/80"
              >
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
          <div className="gap-2 flex flex-col ">
            {recentOrders.map((order) => (
              <CompactOrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function buildScheduleEntries(orders: CustomerOrder[]): ScheduleEntry[] {
  return orders
    .filter((order) => order.status !== "COMPLETED" && order.status !== "CANCELLED")
    .flatMap((order) => {
      const entries: ScheduleEntry[] = [];

      if (order.pickupRequest?.requestedDate && order.pickupRequest.requestedSlot) {
        entries.push({
          id: `pickup-${order.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          lane: "pickup",
          date: order.pickupRequest.requestedDate,
          slot: order.pickupRequest.requestedSlot,
          serviceType: order.serviceType,
          status: order.status,
        });
      }

      if (
        order.deliveryRequest?.requestedDate &&
        order.deliveryRequest.requestedSlot
      ) {
        entries.push({
          id: `dropoff-${order.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          lane: "dropoff",
          date: order.deliveryRequest.requestedDate,
          slot: order.deliveryRequest.requestedSlot,
          serviceType: order.serviceType,
          status: order.status,
        });
      }

      return entries;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function buildTimetableDays(entries: ScheduleEntry[]) {
  const sourceDates =
    entries.length > 0
      ? entries.map((entry) => entry.date)
      : Array.from({ length: 5 }, (_, index) => {
          const date = new Date();
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() + index);
          return date;
        });

  const firstDate = new Date(sourceDates[0]);
  firstDate.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(firstDate);
    date.setDate(firstDate.getDate() + index);
    return date;
  });
}

function buildTimetableSlots(entries: ScheduleEntry[]) {
  const slots = new Set<string>(TIMETABLE_SLOTS);

  entries.forEach((entry) => {
    if (entry.slot) slots.add(entry.slot);
  });

  return Array.from(slots).sort();
}

function TimetableScheduleCard({
  days,
  slots,
  scheduleEntries,
}: {
  days: Date[];
  slots: string[];
  scheduleEntries: ScheduleEntry[];
}) {
  const hasEntries = scheduleEntries.length > 0;

  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 py-0 shadow-sm">
      <CardHeader className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Pickup & Drop-Off Timetable</CardTitle>
              <CardDescription className="mt-1 text-sm">
                See your upcoming laundry movements laid out like a weekly class
                schedule.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900">
              Pickups {scheduleEntries.filter((entry) => entry.lane === "pickup").length}
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
              Drop-offs {scheduleEntries.filter((entry) => entry.lane === "dropoff").length}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="overflow-x-auto">
          <div className="min-w-[760px] rounded-3xl border border-border/60 bg-background/80">
            <div className="grid grid-cols-[104px_repeat(5,minmax(120px,1fr))] border-b border-border/60 bg-muted/35">
              <div className="border-r border-border/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Time
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-r border-border/60 px-3 py-3 last:border-r-0"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {formatWeekday(day)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {day.toLocaleDateString("en-SG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>

            {slots.map((slot) => (
              <div
                key={slot}
                className="grid grid-cols-[104px_repeat(5,minmax(120px,1fr))] border-b border-border/50 last:border-b-0"
              >
                <div className="border-r border-border/60 bg-muted/20 px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">
                    {formatSlot(slot)}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Slot
                  </p>
                </div>

                {days.map((day) => {
                  const cellEntries = scheduleEntries.filter(
                    (entry) => isSameDay(entry.date, day) && entry.slot === slot,
                  );

                  return (
                    <div
                      key={`${day.toISOString()}-${slot}`}
                      className="min-h-28 border-r border-border/50 p-3 last:border-r-0"
                    >
                      {cellEntries.length === 0 ? (
                        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/60 px-3 py-4 text-center text-xs text-muted-foreground">
                          No schedule
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cellEntries.map((entry) => (
                            <Link
                              key={entry.id}
                              href={`/orders/${entry.orderId}`}
                              className={[
                                "block rounded-2xl border px-3 py-3 transition-transform hover:-translate-y-0.5",
                                entry.lane === "pickup"
                                  ? "border-sky-200 bg-sky-50/90"
                                  : "border-emerald-200 bg-emerald-50/90",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {entry.lane === "pickup" ? "Pickup" : "Drop-off"}
                                  </p>
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {entry.orderNumber}
                                  </p>
                                </div>
                                <div
                                  className={[
                                    "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl",
                                    entry.lane === "pickup"
                                      ? "bg-sky-100 text-sky-700"
                                      : "bg-emerald-100 text-emerald-700",
                                  ].join(" ")}
                                >
                                  {entry.lane === "pickup" ? (
                                    <Truck className="h-4 w-4" />
                                  ) : (
                                    <MapPinned className="h-4 w-4" />
                                  )}
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {SERVICE_TYPE_LABELS[entry.serviceType]}
                              </p>
                              <p className="mt-1 text-xs font-medium text-foreground/80">
                                {ORDER_STATUS_LABELS[entry.status]}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {!hasEntries && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-5 text-center">
            <Clock3 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Your timetable will appear here once a pickup or delivery is scheduled.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start a new order to book your first slot.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString("en-SG", { weekday: "short" });
}

function formatSlot(slot: string) {
  const [start, end] = slot.split("-");

  if (!start || !end) return slot;

  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function CompactOrderCard({
  order,
}: {
  order: CustomerOrder;
}) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = order.invoice?.finalTotal ?? order.invoice?.estimatedTotal;
  const isDraft = order.status === "DRAFT";

  if (isDraft) {
    return (
      <Card className="rounded-xl border-border/70 bg-background/75 py-0">
        <CardContent className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {SERVICE_TYPE_LABELS[order.serviceType]} ·{" "}
              {itemCount > 0 ? `${itemCount} items saved` : "Draft items pending"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Link href={`/orders/${order.id}`} className="inline-flex">
              <Button variant="outline" size="sm" className="rounded-xl">
                Continue Draft
              </Button>
            </Link>
            <DeleteDraftOrderButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="rounded-xl border-border/70 bg-background/75 py-0 transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {SERVICE_TYPE_LABELS[order.serviceType]} ·{" "}
              {itemCount > 0 ? `${itemCount} items` : "Items pending"}
            </p>
          </div>
          <div className="text-right">
            {total ? (
              <p className="text-sm font-semibold text-foreground">
                SGD {total.toFixed(2)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Est. pending</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {ORDER_STATUS_LABELS[order.status]}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
