"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAvailableTimeSlotsAction, requestPickupAction } from "@/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Address } from "@prisma/client";
import { PICKUP_TIME_SLOTS } from "@/types/constants";
import type { TimeSlot } from "@/types";

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
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const resetSelectedSlotIfUnavailable = useEffectEvent((slots: TimeSlot[]) => {
    if (!selectedSlot) return;

    if (!slots.some((slot) => slot.value === selectedSlot && slot.available)) {
      setSelectedSlot("");
    }
  });

  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 0) return null;
    return d;
  }).filter(Boolean) as Date[];

  useEffect(() => {
    let isActive = true;

    async function loadSlots() {
      if (!selectedDate) {
        setAvailableSlots([]);
        setSelectedSlot("");
        return;
      }

      setLoadingSlots(true);
      const slots = await getAvailableTimeSlotsAction({
        requestedDate: selectedDate,
        requestKind: "pickup",
      });

      if (!isActive) return;

      setAvailableSlots(slots);
      setLoadingSlots(false);
      resetSelectedSlotIfUnavailable(slots);
    }

    void loadSlots();

    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  const slotsToShow =
    selectedDate && availableSlots.length > 0
      ? availableSlots
      : PICKUP_TIME_SLOTS.map((slot) => ({
          ...slot,
          available: false,
          remainingCapacity: 0,
        }));

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
            {selectedDate ? (
              <p className="text-xs text-muted-foreground">
                Full slots are disabled. Pickups close automatically when capacity is reached.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Choose a date first to see live slot availability.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {slotsToShow.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot.value)}
                  className={`border rounded-lg px-3 py-2 text-sm text-left transition-all bg-white ${
                    !slot.available
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                      : ""
                  } ${
                    selectedSlot === slot.value
                      ? "border-blue-500 ring-1 ring-blue-500"
                      : slot.available
                      ? "border-gray-200 hover:border-blue-300"
                      : ""
                  }`}
                >
                  <div className="font-medium">{slot.label}</div>
                  <div className="mt-1 text-xs">
                    {!selectedDate || loadingSlots
                      ? "Checking availability..."
                      : slot.available
                      ? `${slot.remainingCapacity} slot${slot.remainingCapacity === 1 ? "" : "s"} left`
                      : "Fully booked"}
                  </div>
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
