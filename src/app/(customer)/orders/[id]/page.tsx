import { getOrderDetailAction } from "@/actions/orders";
import { notFound } from "next/navigation";
import OrderTimeline from "@/components/shared/OrderTimeline";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CLOTHING_CATEGORY_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types/constants";
import PickupScheduleCard from "@/components/customer/PickupScheduleCard";
import DeleteDraftOrderButton from "@/components/customer/DeleteDraftOrderButton";
import PayInvoiceButton from "@/components/customer/PayInvoiceButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetailAction(id);

  if (!order) notFound();

  const isEstimate =
    !order.invoice?.confirmedTotal && order.invoice?.estimatedTotal;
  const canSchedulePickup =
    order.status === "PENDING_PICKUP_SCHEDULING" && !order.pickupRequest;
  const isDraft = order.status === "DRAFT";
  const canPayInvoice =
    !!order.invoice &&
    order.invoice.status === "CONFIRMED" &&
    [
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "RECEIVED_AT_STORE",
      "WASHING",
      "DRYING",
      "PRESSING_OR_FINISHING",
      "READY_FOR_COLLECTION",
      "OUT_FOR_DELIVERY",
    ].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-gray-500 text-sm">
            {SERVICE_TYPE_LABELS[order.serviceType]} · Created{" "}
            {new Date(order.createdAt).toLocaleDateString("en-SG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <DeleteDraftOrderButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              redirectTo="/dashboard"
            />
          )}
          <Link href="/dashboard"><Button variant="outline" size="sm">Back</Button></Link>
        </div>
      </div>

      {/* Status Timeline */}
      <OrderTimeline currentStatus={order.status} history={order.statusHistory} />

      {/* Pickup Schedule Prompt */}
      {canSchedulePickup && order.address && (
        <PickupScheduleCard
          orderId={order.id}
          addressId={order.addressId!}
          address={order.address}
        />
      )}

      {/* Pickup Info */}
      {order.pickupRequest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pickup Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span>
                {new Date(order.pickupRequest.requestedDate).toLocaleDateString(
                  "en-SG",
                  { weekday: "long", day: "numeric", month: "long" }
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time Slot</span>
              <span>{order.pickupRequest.requestedSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <Badge variant="outline">
                {order.pickupRequest.status}
              </Badge>
            </div>
            {order.pickupRequest.driver && (
              <div className="flex justify-between">
                <span className="text-gray-500">Driver</span>
                <span>{order.pickupRequest.driver.user?.name ?? "Assigned"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {order.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Laundry Items
              {order.aiAnalysis && (
                <Badge variant="secondary" className="ml-2 text-xs font-normal">
                  AI Detected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-sm py-1"
                >
                  <span className="text-gray-700">
                    {CLOTHING_CATEGORY_LABELS[item.category]} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    SGD {item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>
                  Total Items:{" "}
                  {order.items.reduce((s, i) => s + i.quantity, 0)}
                </span>
                <span>
                  {order.invoice
                    ? `SGD ${(order.invoice.finalTotal ?? order.invoice.estimatedTotal).toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice */}
      {order.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Invoice
              {isEstimate && (
                <Badge variant="outline" className="text-xs font-normal">
                  Estimated — pending staff verification
                </Badge>
              )}
              {!isEstimate && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {order.invoice.status.replace(/_/g, " ")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>SGD {order.invoice.estimatedTotal.toFixed(2)}</span>
            </div>
            {order.invoice.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery fee</span>
                <span>SGD {order.invoice.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>
                {order.invoice.confirmedTotal ? "Final Total" : "Estimated Total"}
              </span>
              <span>
                SGD{" "}
                {(
                  order.invoice.finalTotal ?? order.invoice.estimatedTotal
                ).toFixed(2)}
              </span>
            </div>
            {isEstimate && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded p-2 mt-2">
                This is an estimated amount. The final bill will be confirmed by
                our staff after physical inspection.
              </p>
            )}
            {canPayInvoice && (
              <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-800">
                  You can pay anytime after pickup is scheduled. The order will
                  only be marked completed after payment succeeds.
                </p>
                <PayInvoiceButton
                  orderId={order.id}
                  amount={order.invoice.finalTotal ?? order.invoice.estimatedTotal}
                />
              </div>
            )}
            {order.invoice.status === "PAID" && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded p-2">
                Payment received
                {order.invoice.paidAt
                  ? ` on ${new Date(order.invoice.paidAt).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}.`
                  : "."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis warnings */}
      {order.aiAnalysis &&
        order.aiAnalysis.previewWarnings.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                AI Analysis Notes
              </p>
              <ul className="space-y-1">
                {order.aiAnalysis.previewWarnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-2">
                    <span>•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
