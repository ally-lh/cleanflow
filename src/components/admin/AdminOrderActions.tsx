"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  updateOrderStatusAction,
  confirmInvoiceAction,
  approvePickupAction,
  rejectPickupAction,
} from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/types/constants";
import type { OrderWithRelations } from "@/types";
import { OrderStatus } from "@prisma/client";

interface Driver {
  id: string;
  user: { name: string | null } | null;
}

interface Props {
  order: OrderWithRelations;
  drivers: Driver[];
}

type QuickAction =
  | {
      kind: "status";
      title: string;
      description: string;
      buttonLabel: string;
      nextStatus: OrderStatus;
      disabled?: boolean;
      disabledReason?: string;
      successMessage?: string;
    }
  | {
      kind: "pickup";
      title: string;
      description: string;
      buttonLabel: string;
      requestedDate: string;
      requestedSlot: string;
    }
  | {
      kind: "info";
      title: string;
      description: string;
    };

export default function AdminOrderActions({ order, drivers }: Props) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusNotes, setStatusNotes] = useState("");
  const [confirmedSubtotal, setConfirmedSubtotal] = useState(
    order.invoice?.confirmedTotal ?? order.invoice?.estimatedTotal ?? 0
  );
  const [deliveryFee, setDeliveryFee] = useState(order.invoice?.deliveryFee ?? 0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const canCompleteOrder = order.invoice?.status === "PAID";

  async function handleAdvanceStatus(
    status: OrderStatus,
    successMessage = "Order moved to the next step."
  ) {
    setLoading(true);
    const result = await updateOrderStatusAction({
      orderId: order.id,
      status,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(successMessage);
    router.refresh();
  }

  async function handleStatusUpdate() {
    setLoading(true);
    const result = await updateOrderStatusAction({
      orderId: order.id,
      status: newStatus,
      notes: statusNotes || undefined,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Status updated.");
    router.refresh();
  }

  async function handleConfirmInvoice() {
    setLoading(true);
    const result = await confirmInvoiceAction({
      orderId: order.id,
      confirmedTotal: confirmedSubtotal,
      deliveryFee,
      notes: invoiceNotes || undefined,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Invoice confirmed.");
    router.refresh();
  }

  async function handleApprovePickup() {
    if (!order.pickupRequest) return;
    setLoading(true);
    const result = await approvePickupAction(
      order.pickupRequest.id,
      selectedDriver || undefined
    );
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pickup approved and scheduled.");
    router.refresh();
  }

  async function handleRejectPickup() {
    if (!order.pickupRequest) return;
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    setLoading(true);
    const result = await rejectPickupAction(order.pickupRequest.id, reason);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pickup request rejected.");
    router.refresh();
  }

  const statusOptions = Object.values(OrderStatus);
  const quickAction = getQuickAction(order, canCompleteOrder);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm text-blue-900">
              Recommended Next Step
            </CardTitle>
            {quickAction.kind !== "info" && (
              <Badge variant="secondary" className="text-[11px]">
                One click
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-blue-950">{quickAction.title}</p>
            <p className="mt-1 text-xs text-blue-800">{quickAction.description}</p>
          </div>

          {quickAction.kind === "status" && (
            <>
              {quickAction.disabled && quickAction.disabledReason && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                  {quickAction.disabledReason}
                </p>
              )}
              <Button
                onClick={() =>
                  handleAdvanceStatus(
                    quickAction.nextStatus,
                    quickAction.successMessage
                  )
                }
                disabled={loading || quickAction.disabled}
                className="w-full"
              >
                {quickAction.buttonLabel}
              </Button>
            </>
          )}

          {quickAction.kind === "pickup" && (
            <>
              <div className="rounded-lg border border-blue-200 bg-white/80 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-blue-700">Requested date</span>
                  <span className="font-medium text-blue-950">
                    {quickAction.requestedDate}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-blue-700">Requested slot</span>
                  <span className="font-medium text-blue-950">
                    {quickAction.requestedSlot}
                  </span>
                </div>
              </div>

              {drivers.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-blue-700">
                    Assign Driver (optional)
                  </Label>
                  <Select
                    value={selectedDriver}
                    onValueChange={(v) => {
                      if (v !== null) setSelectedDriver(v);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Leave unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.user?.name ?? d.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleApprovePickup}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {quickAction.buttonLabel}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Manual Status Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">New Status</Label>
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as OrderStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Notes (optional)</Label>
            <Textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes..."
            />
          </div>
          {newStatus === "COMPLETED" && !canCompleteOrder && (
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
              Payment must succeed before this order can be marked completed.
            </p>
          )}
          <Button
            onClick={handleStatusUpdate}
            disabled={
              loading ||
              newStatus === order.status ||
              (newStatus === "COMPLETED" && !canCompleteOrder)
            }
            size="sm"
            className="w-full"
          >
            Update Status
          </Button>
        </CardContent>
      </Card>

      {/* Pickup approval (only if pending) */}
      {order.pickupRequest?.status === "PENDING" && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm text-amber-800">Pickup Approval Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {drivers.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Assign Driver (optional)</Label>
                <Select value={selectedDriver} onValueChange={(v) => { if (v !== null) setSelectedDriver(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.user?.name ?? d.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleApprovePickup}
                disabled={loading}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                onClick={handleRejectPickup}
                disabled={loading}
                size="sm"
                variant="destructive"
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice confirmation */}
      {order.invoice && order.invoice.status === "PENDING_VERIFICATION" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confirm Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Confirmed Subtotal (SGD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={confirmedSubtotal}
                onChange={(e) => setConfirmedSubtotal(parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Delivery Fee (SGD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value))}
              />
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Final Total</span>
              <span>SGD {(confirmedSubtotal + deliveryFee).toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Notes (optional)</Label>
              <Textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={2}
                placeholder="Any billing notes..."
              />
            </div>
            <Button
              onClick={handleConfirmInvoice}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              Confirm Invoice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getQuickAction(
  order: OrderWithRelations,
  canCompleteOrder: boolean
): QuickAction {
  switch (order.status) {
    case "PENDING_CONFIRMATION":
      if (order.pickupMethod === "CUSTOMER_DROPOFF") {
        return {
          kind: "status",
          title: "Customer drop-off received",
          description:
            "Use this once the customer has handed over the laundry at the store.",
          buttonLabel: "Mark Received at Store",
          nextStatus: "RECEIVED_AT_STORE",
          successMessage: "Order marked as received at store.",
        };
      }

      return {
        kind: "info",
        title: "Waiting for customer response",
        description:
          "This order is pending customer confirmation before staff can move it forward.",
      };

    case "PENDING_PICKUP_SCHEDULING":
      if (order.pickupRequest?.status === "PENDING") {
        return {
          kind: "pickup",
          title: "Pickup request ready for approval",
          description:
            "Approve the customer's requested pickup slot to schedule the collection.",
          buttonLabel: "Approve Pickup Request",
          requestedDate: new Date(
            order.pickupRequest.requestedDate
          ).toLocaleDateString("en-SG", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          requestedSlot: order.pickupRequest.requestedSlot,
        };
      }

      return {
        kind: "info",
        title: "Waiting for pickup request",
        description:
          "The customer has submitted the order, but has not requested a pickup slot yet.",
      };

    case "PICKUP_SCHEDULED":
      return {
        kind: "status",
        title: "Pickup completed",
        description:
          "Move the order forward once the driver has collected the laundry.",
        buttonLabel: "Mark Picked Up",
        nextStatus: "PICKED_UP",
        successMessage: "Order marked as picked up.",
      };

    case "PICKED_UP":
      return {
        kind: "status",
        title: "Arrived at store",
        description:
          "Confirm the order is back at the store and ready to be checked in.",
        buttonLabel: "Mark Received at Store",
        nextStatus: "RECEIVED_AT_STORE",
        successMessage: "Order marked as received at store.",
      };

    case "RECEIVED_AT_STORE":
      return {
        kind: "status",
        title: "Start cleaning",
        description: "Begin processing this order in the washing stage.",
        buttonLabel: "Start Washing",
        nextStatus: "WASHING",
        successMessage: "Order moved to washing.",
      };

    case "WASHING":
      return {
        kind: "status",
        title: "Move to drying",
        description: "Advance the order after washing has been completed.",
        buttonLabel: "Mark Drying",
        nextStatus: "DRYING",
        successMessage: "Order moved to drying.",
      };

    case "DRYING":
      return {
        kind: "status",
        title: "Move to finishing",
        description: "Advance the order to pressing and final finishing.",
        buttonLabel: "Mark Pressing & Finishing",
        nextStatus: "PRESSING_OR_FINISHING",
        successMessage: "Order moved to pressing and finishing.",
      };

    case "PRESSING_OR_FINISHING":
      return {
        kind: "status",
        title: "Ready for customer",
        description:
          "Use this when the garments are finished and ready for collection or dispatch.",
        buttonLabel: "Mark Ready for Collection",
        nextStatus: "READY_FOR_COLLECTION",
        successMessage: "Order marked ready for collection.",
      };

    case "READY_FOR_COLLECTION":
      if (order.collectionMethod === "DELIVERY") {
        return {
          kind: "status",
          title: "Dispatch for delivery",
          description:
            "Move the order out for delivery once a driver has taken it for the customer.",
          buttonLabel: "Mark Out for Delivery",
          nextStatus: "OUT_FOR_DELIVERY",
          successMessage: "Order marked out for delivery.",
        };
      }

      return {
        kind: "status",
        title: "Complete after handover",
        description:
          "Mark the order complete after the customer has collected it and payment is settled.",
        buttonLabel: "Mark Completed",
        nextStatus: "COMPLETED",
        disabled: !canCompleteOrder,
        disabledReason:
          "Payment must succeed before this order can be marked completed.",
        successMessage: "Order marked as completed.",
      };

    case "OUT_FOR_DELIVERY":
      return {
        kind: "status",
        title: "Complete after delivery",
        description:
          "Finish the order once it has been delivered and payment is settled.",
        buttonLabel: "Mark Completed",
        nextStatus: "COMPLETED",
        disabled: !canCompleteOrder,
        disabledReason:
          "Payment must succeed before this order can be marked completed.",
        successMessage: "Order marked as completed.",
      };

    case "COMPLETED":
      return {
        kind: "info",
        title: "Order completed",
        description: "This order has already finished its lifecycle.",
      };

    case "CANCELLED":
      return {
        kind: "info",
        title: "Order cancelled",
        description: "No further action is needed unless you want to override it manually.",
      };

    default:
      return {
        kind: "info",
        title: "Choose a manual update",
        description:
          "This order does not have a single obvious next step, so use the manual status controls below.",
      };
  }
}
