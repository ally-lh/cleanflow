import { getOrderDetailAction } from "@/actions/orders";
import { getActiveDriversAction } from "@/actions/admin";
import { notFound } from "next/navigation";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import OrderTimeline from "@/components/shared/OrderTimeline";
import AdminOrderActions from "@/components/admin/AdminOrderActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CLOTHING_CATEGORY_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types/constants";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, drivers] = await Promise.all([
    getOrderDetailAction(id),
    getActiveDriversAction(),
  ]);

  if (!order) notFound();

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-gray-500 text-sm">
            {SERVICE_TYPE_LABELS[order.serviceType]} ·{" "}
            {order.customer.user.name} · {order.customer.user.email} ·{" "}
            Created {new Date(order.createdAt).toLocaleDateString("en-SG")}
          </p>
        </div>
        <Link href="/admin/orders"><Button variant="outline" size="sm">Back</Button></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Timeline */}
          <OrderTimeline currentStatus={order.status} history={order.statusHistory} />

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Laundry Items ({totalItems} pieces)
                {order.aiAnalysis && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    AI Detected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <div>
                      <span className="text-gray-900">
                        {CLOTHING_CATEGORY_LABELS[item.category]}
                      </span>
                      {item.isAiDetected && (
                        <span className="ml-2 text-xs text-gray-400">
                          AI ({Math.round((item.confidence ?? 0) * 100)}%)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-6 text-gray-600">
                      <span>× {item.quantity}</span>
                      <span>SGD {item.unitPrice.toFixed(2)} each</span>
                      <span className="font-medium text-gray-900">
                        SGD {item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                {order.items.length === 0 && (
                  <p className="text-sm text-gray-400">No items recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice */}
          {order.invoice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Invoice
                  <Badge
                    variant={
                      order.invoice.status === "CONFIRMED" ? "default" : "outline"
                    }
                    className="ml-2 text-xs font-normal"
                  >
                    {order.invoice.status.replace(/_/g, " ")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estimated Subtotal</span>
                  <span>SGD {order.invoice.estimatedTotal.toFixed(2)}</span>
                </div>
                {order.invoice.confirmedTotal && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Confirmed Subtotal</span>
                    <span>SGD {order.invoice.confirmedTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span>SGD {order.invoice.deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Final Total</span>
                  <span>
                    SGD {(order.invoice.finalTotal ?? order.invoice.estimatedTotal).toFixed(2)}
                  </span>
                </div>
                {order.invoice.notes && (
                  <p className="text-xs text-gray-400 mt-2">{order.invoice.notes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {order.aiAnalysis && (
            <Card className="border-blue-100 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base text-blue-900">
                  AI Analysis Result
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {order.aiAnalysis.modelUsed}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">Detected Pieces</span>
                  <span className="font-medium">{order.aiAnalysis.totalEstimatedPieces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Customer Confirmed</span>
                  <span>{order.aiAnalysis.customerConfirmed ? "Yes" : "No"}</span>
                </div>
                {order.aiAnalysis.previewWarnings.length > 0 && (
                  <div>
                    <p className="text-blue-700 font-medium mb-1">Warnings:</p>
                    <ul className="space-y-1">
                      {order.aiAnalysis.previewWarnings.map((w, i) => (
                        <li key={i} className="text-xs text-blue-600">• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Images */}
          {order.uploadedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uploaded Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  {order.uploadedImages.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-24 h-24 rounded-lg border overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.fileName}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: actions panel */}
        <div className="space-y-5">
          <AdminOrderActions
            order={order}
            drivers={drivers}
          />

          {/* Pickup request */}
          {order.pickupRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pickup Request</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span>
                    {new Date(order.pickupRequest.requestedDate).toLocaleDateString("en-SG")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slot</span>
                  <span>{order.pickupRequest.requestedSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="outline">{order.pickupRequest.status}</Badge>
                </div>
                {order.pickupRequest.address && (
                  <div className="pt-2 border-t">
                    <p className="text-gray-500 text-xs mb-1">Address</p>
                    <p className="text-gray-800">
                      {order.pickupRequest.address.streetLine1}
                    </p>
                    <p className="text-gray-600">
                      {order.pickupRequest.address.postalCode}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{order.customer.user.name}</p>
              <p className="text-gray-500">{order.customer.user.email}</p>
              {order.customer.phone && (
                <p className="text-gray-500">{order.customer.phone}</p>
              )}
              {order.address && (
                <div className="pt-2 border-t">
                  <p className="text-gray-500 text-xs mb-1">Delivery Address</p>
                  <p>{order.address.streetLine1}</p>
                  <p className="text-gray-500">{order.address.postalCode}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
