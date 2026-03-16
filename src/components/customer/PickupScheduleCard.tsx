"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestPickupAction } from "@/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Address } from "@prisma/client";
import { PICKUP_TIME_SLOTS } from "@/types/constants";

interface Props {
  orderId: string;
  addressId: string;
  address: Address;
}

export default function PickupScheduleCard({ orderId, addressId, address }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 0) return null;
    return d;
  }).filter(Boolean) as Date[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("addressId", addressId);
    fd.append("requestedDate", selectedDate);
    fd.append("requestedSlot", selectedSlot);

    const result = await requestPickupAction(fd);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Pickup request submitted!");
    router.refresh();
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-base text-blue-900">
          Schedule Your Pickup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-white border-blue-200">
          <AlertDescription className="text-sm text-blue-800">
            Pickup address: <strong>{address.streetLine1}</strong>, {address.postalCode}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Select value={selectedDate} onValueChange={(v) => { if (v !== null) setSelectedDate(v); }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Choose a date" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map((d) => (
                  <SelectItem
                    key={d.toISOString()}
                    value={d.toISOString().split("T")[0]}
                  >
                    {d.toLocaleDateString("en-SG", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time Slot</Label>
            <div className="grid grid-cols-2 gap-2">
              {PICKUP_TIME_SLOTS.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setSelectedSlot(slot.value)}
                  className={`border rounded-lg px-3 py-2 text-sm text-left transition-all bg-white ${
                    selectedSlot === slot.value
                      ? "border-blue-500 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!selectedDate || !selectedSlot || submitting}
          >
            {submitting ? "Scheduling..." : "Request Pickup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
