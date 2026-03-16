"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approvePickupAction, rejectPickupAction } from "@/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Pickup {
  id: string;
  orderId: string;
  requestedDate: Date;
  requestedSlot: string;
  status: string;
  order: {
    orderNumber: string;
    customer: { user: { name: string | null; email: string | null } };
    invoice: { estimatedTotal: number; finalTotal: number | null } | null;
  };
  address: {
    streetLine1: string;
    city: string;
    postalCode: string;
  };
  driver: { id: string; user: { name: string | null } | null } | null;
}

interface Driver {
  id: string;
  user: { name: string | null } | null;
}

interface Props {
  pickup: Pickup;
  drivers: Driver[];
}

export default function PickupApprovalCard({ pickup, drivers }: Props) {
  const router = useRouter();
  const [driverId, setDriverId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const result = await approvePickupAction(pickup.id, driverId || undefined);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Pickup for ${pickup.order.orderNumber} approved.`);
    router.refresh();
  }

  async function handleReject() {
    const reason = prompt("Reason for rejection (will be noted):");
    if (!reason) return;
    setLoading(true);
    const result = await rejectPickupAction(pickup.id, reason);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pickup request rejected.");
    router.refresh();
  }

  return (
    <Card className="border-amber-200">
      <CardContent className="py-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/orders/${pickup.orderId}`}
                className="font-semibold text-gray-900 hover:underline"
              >
                {pickup.order.orderNumber}
              </Link>
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Pending
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              {pickup.order.customer.user.name} · {pickup.order.customer.user.email}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-gray-900">
              {new Date(pickup.requestedDate).toLocaleDateString("en-SG", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
            <p className="text-gray-500">{pickup.requestedSlot}</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
          <p className="font-medium text-gray-800">Pickup Address</p>
          <p>{pickup.address.streetLine1}</p>
          <p>{pickup.address.city}, {pickup.address.postalCode}</p>
        </div>

        {pickup.order.invoice && (
          <div className="text-sm flex justify-between">
            <span className="text-gray-500">Estimated Order Value</span>
            <span className="font-medium">
              SGD {(pickup.order.invoice.finalTotal ?? pickup.order.invoice.estimatedTotal).toFixed(2)}
            </span>
          </div>
        )}

        {drivers.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Assign Driver (optional)</Label>
            <Select value={driverId} onValueChange={(v) => { if (v !== null) setDriverId(v); }}>
              <SelectTrigger>
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

        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            Approve Pickup
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            size="sm"
            className="flex-1"
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
