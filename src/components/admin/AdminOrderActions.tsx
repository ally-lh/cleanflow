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

  return (
    <div className="space-y-4">
      {/* Status update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Update Status</CardTitle>
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
          <Button
            onClick={handleStatusUpdate}
            disabled={loading || newStatus === order.status}
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
      {order.invoice && order.invoice.status !== "CONFIRMED" && (
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
