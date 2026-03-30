"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createOrderAction,
  analyzeOrderImageAction,
  confirmOrderAction,
  saveAddressAction,
} from "@/actions/orders";
import { enrichItemsWithPrices, calculatePriceBreakdown, BASE_ORDER_PRICE_SGD } from "@/lib/pricing/pricingEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Address } from "@prisma/client";
import type { EditableOrderItem } from "@/types";
import { ServiceType, CollectionMethod } from "@prisma/client";
import {
  SERVICE_TYPE_LABELS,
  CLOTHING_CATEGORY_LABELS,
} from "@/types/constants";
import { Camera, Car, Store, Truck } from "lucide-react";

function formatAddress(a: Address): string {
  return `${a.label ? a.label + " — " : ""}${a.streetLine1}, ${a.postalCode}`;
}

// ──────────────────────────────────────────
// STEP TYPES
// ──────────────────────────────────────────

type Step = "service" | "photo" | "review" | "schedule";

interface Props {
  addresses: Address[];
  customerId: string;
}

// ──────────────────────────────────────────
// WIZARD COMPONENT
// ──────────────────────────────────────────

export default function NewOrderWizard({ addresses, customerId }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("service");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.WASH_AND_FOLD);
  const [pickupMethod, setPickupMethod] = useState<"CUSTOMER_DROPOFF" | "SCHEDULED_PICKUP">("SCHEDULED_PICKUP");
  const [addressId, setAddressId] = useState<string>(addresses[0]?.id ?? "");
  const [specialNotes, setSpecialNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<EditableOrderItem[]>([]);
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>(CollectionMethod.SELF_COLLECTION);
  const [submitting, setSubmitting] = useState(false);
  const [localAddresses, setLocalAddresses] = useState<Address[]>(addresses);
  const [showNewAddrForm, setShowNewAddrForm] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("");
  const [newAddrStreet, setNewAddrStreet] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");
  const [savingAddr, setSavingAddr] = useState(false);

  const stepIndex = ["service", "photo", "review", "schedule"].indexOf(step);
  const progress = ((stepIndex + 1) / 4) * 100;

  // ── STEP 1: Service selection ───────────

  async function handleServiceNext() {
    setSubmitting(true);
    const fd = new FormData();
    fd.append("serviceType", serviceType);
    fd.append("pickupMethod", pickupMethod);
    fd.append("specialNotes", specialNotes);
    if (addressId) fd.append("addressId", addressId);

    const result = await createOrderAction(fd);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setOrderId(result.data!.orderId);
    setStep("photo");
  }

  async function handleSaveAddressStep1() {
    setSavingAddr(true);
    const fd = new FormData();
    if (newAddrLabel) fd.append("label", newAddrLabel);
    fd.append("streetLine1", newAddrStreet);
    fd.append("postalCode", newAddrPostal);
    fd.append("city", "Singapore");
    const result = await saveAddressAction(fd);
    setSavingAddr(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to save address.");
      return;
    }
    const newAddr = {
      id: result.data!.addressId,
      customerId: "",
      label: newAddrLabel || null,
      streetLine1: newAddrStreet,
      streetLine2: null,
      city: "Singapore",
      state: null,
      postalCode: newAddrPostal,
      country: "Singapore",
      isDefault: false,
      lat: null,
      lng: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Address;
    setLocalAddresses((prev) => [...prev, newAddr]);
    setAddressId(result.data!.addressId);
    setShowNewAddrForm(false);
    setNewAddrLabel("");
    setNewAddrStreet("");
    setNewAddrPostal("");
    toast.success("Address saved!");
  }

  // ── STEP 2: Photo upload ─────────────────

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageUrl(dataUrl); // pass actual image data to AI analysis
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!orderId || !imageUrl) return;
    setAnalyzing(true);

    const result = await analyzeOrderImageAction(
      orderId,
      imageUrl,
      imageUrl.split("/").pop() ?? "image.jpg"
    );

    setAnalyzing(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    // Enrich items with prices
    const enriched = enrichItemsWithPrices(result.data!.items, serviceType);
    setItems(enriched);
    toast.success("AI analysis complete — please review the detected items.");
    setStep("review");
  }

  // ── STEP 3: Review & edit items ──────────

  function updateItem(index: number, field: keyof EditableOrderItem, value: string | number | boolean) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.totalPrice = parseFloat(
          ((item.quantity as number) * (item.unitPrice as number)).toFixed(2)
        );
      }
      next[index] = item;
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        category: "SHIRT",
        quantity: 1,
        unitPrice: 2.5,
        totalPrice: 2.5,
        isAiDetected: false,
      },
    ]);
  }

  const pricing = calculatePriceBreakdown(
    items,
    serviceType,
    collectionMethod === "DELIVERY"
  );

  async function handleConfirm() {
    if (!orderId) return;
    setSubmitting(true);

    const result = await confirmOrderAction({
      orderId,
      items,
      collectionMethod,
      specialNotes,
    });

    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (pickupMethod === "SCHEDULED_PICKUP") {
      setStep("schedule");
    } else {
      toast.success("Order submitted! Please drop off your laundry at our store.");
      router.push(`/orders/${orderId}`);
    }
  }

  // ── STEP 4: Schedule pickup ──────────────

  function handleScheduleDone() {
    router.push(`/orders/${orderId}`);
  }

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          {["Service", "Photo", "Review", "Schedule"].map((s, i) => (
            <span
              key={s}
              className={stepIndex >= i ? "text-blue-600 font-medium" : ""}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* ── Step 1: Service ── */}
      {step === "service" && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select
                value={serviceType}
                onValueChange={(v) => setServiceType(v as ServiceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>How will we receive your laundry?</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "SCHEDULED_PICKUP", label: "Schedule a Pickup", icon: <Car className="w-5 h-5" />, desc: "We come to you" },
                  { value: "CUSTOMER_DROPOFF", label: "I'll Drop Off", icon: <Store className="w-5 h-5" />, desc: "Bring it to our store" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPickupMethod(opt.value as "CUSTOMER_DROPOFF" | "SCHEDULED_PICKUP")}
                    className={`border-2 rounded-xl p-4 text-left transition-all ${
                      pickupMethod === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="mb-2 text-gray-700">{opt.icon}</div>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {pickupMethod === "SCHEDULED_PICKUP" && (
              <div className="space-y-2">
                <Label>Pickup Address</Label>
                <Select value={addressId} onValueChange={(v) => {
                  if (!v) return;
                  if (v === "__new__") {
                    setShowNewAddrForm(true);
                  } else {
                    setAddressId(v);
                    setShowNewAddrForm(false);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select address">
                      {localAddresses.find((a) => a.id === addressId)
                        ? formatAddress(localAddresses.find((a) => a.id === addressId)!)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {localAddresses.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {formatAddress(a)}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Add new address</SelectItem>
                  </SelectContent>
                </Select>
                {showNewAddrForm && (
                  <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                    <div className="space-y-1">
                      <Label className="text-xs">Label (optional)</Label>
                      <Input
                        placeholder="e.g. Home, Office"
                        value={newAddrLabel}
                        onChange={(e) => setNewAddrLabel(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Street Address *</Label>
                      <Input
                        placeholder="e.g. 123 Orchard Road"
                        value={newAddrStreet}
                        onChange={(e) => setNewAddrStreet(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Postal Code *</Label>
                      <Input
                        placeholder="e.g. 238867"
                        value={newAddrPostal}
                        onChange={(e) => setNewAddrPostal(e.target.value)}
                        className="h-8 text-sm"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowNewAddrForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={!newAddrStreet || !newAddrPostal || savingAddr}
                        onClick={handleSaveAddressStep1}
                      >
                        {savingAddr ? "Saving..." : "Save Address"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Special Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Delicate fabrics, stain on item 2..."
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleServiceNext} disabled={submitting} className="w-full">
              {submitting ? "Creating order..." : "Next: Upload Photo"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Photo ── */}
      {step === "photo" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Laundry Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Strong instruction prompt */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 font-medium">
                Please make sure <strong>every piece of laundry is clearly visible</strong> in the photo.
                Lay items flat or spread them out. Items hidden underneath others may not be detected.
              </AlertDescription>
            </Alert>

            {/* Upload area */}
            <div className="space-y-3">
              <Label htmlFor="laundry-photo">Laundry Photo</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                {imagePreview ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Laundry preview"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-sm text-gray-500">
                      Photo selected. Click below to analyze.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-600">
                      Click to select a photo of your laundry
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG, PNG — max 10MB
                    </p>
                  </div>
                )}
                <input
                  id="laundry-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Label
                  htmlFor="laundry-photo"
                  className="mt-3 inline-block cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {imagePreview ? "Change photo" : "Select photo"}
                </Label>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800 text-xs">
                The AI analysis is an <strong>estimate only</strong>. You will be able to review
                and adjust the detected items in the next step before submitting.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("service")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!imageUrl || analyzing}
                className="flex-1"
              >
                {analyzing ? "Analysing photo..." : "Analyse Photo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Review items ── */}
      {step === "review" && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Detected Items
                <Badge variant="secondary">AI Estimate</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {imagePreview && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Your laundry"
                    className="w-20 h-20 rounded-md object-cover shrink-0"
                  />
                  <div className="text-xs text-gray-500 pt-1">
                    <p className="font-medium text-gray-700 mb-1">Your photo</p>
                    <p>AI detected items are listed below. Adjust quantities if anything looks off.</p>
                  </div>
                </div>
              )}

              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800 text-xs">
                  Please review and correct the quantities below. The final bill
                  will be confirmed by our staff after physical inspection.
                </AlertDescription>
              </Alert>

              {/* Item list */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <Select
                        value={item.category}
                        onValueChange={(v) => { if (v !== null) updateItem(index, "category", v); }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CLOTHING_CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateItem(index, "quantity", Math.max(0, item.quantity - 1))}
                        className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold"
                      >
                        −
                      </button>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        className="w-14 h-8 text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => updateItem(index, "quantity", item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right">
                      SGD {item.totalPrice.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add item manually
              </button>

              <Separator />

              {/* Collection method */}
              <div className="space-y-2">
                <Label>How will you collect your laundry?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "SELF_COLLECTION", label: "Self Collection", icon: <Store className="w-4 h-4" />, desc: "Pick up from store" },
                    { value: "DELIVERY", label: "Delivery", icon: <Truck className="w-4 h-4" />, desc: `+SGD 5.00 delivery fee` },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCollectionMethod(opt.value as CollectionMethod)}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${
                        collectionMethod === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="mb-1 text-gray-700">{opt.icon}</div>
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 flex justify-between">
                  <span>Estimated Total</span>
                  <Badge variant="outline">Estimate</Badge>
                </p>
                {pricing.baseFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Base price</span>
                    <span>SGD {pricing.baseFee.toFixed(2)}</span>
                  </div>
                )}
                {pricing.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600">
                    <span>{item.label} × {item.quantity}</span>
                    <span>SGD {item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                {pricing.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery fee</span>
                    <span>SGD {pricing.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>SGD {pricing.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Includes a base price of SGD {BASE_ORDER_PRICE_SGD.toFixed(2)}, with clothing charges added on top. Final amount confirmed after staff inspection.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("photo")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={submitting || items.length === 0}
                  className="flex-1"
                >
                  {submitting ? "Submitting..." : "Confirm Order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 4: Schedule pickup ── */}
      {step === "schedule" && orderId && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Your Pickup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Your order has been submitted! Now choose a pickup time and we&apos;ll
                come to collect your laundry.
              </AlertDescription>
            </Alert>
            <PickupScheduleForm orderId={orderId} addresses={localAddresses} addressId={addressId} onDone={handleScheduleDone} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// PICKUP SCHEDULE FORM (inline sub-component)
// ──────────────────────────────────────────

function PickupScheduleForm({
  orderId,
  addresses,
  addressId: defaultAddressId,
  onDone,
}: {
  orderId: string;
  addresses: Address[];
  addressId: string;
  onDone: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(defaultAddressId);
  const [submitting, setSubmitting] = useState(false);
  const [scheduleAddresses, setScheduleAddresses] = useState<Address[]>(addresses);
  const [showNewAddrForm, setShowNewAddrForm] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("");
  const [newAddrStreet, setNewAddrStreet] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");
  const [savingAddr, setSavingAddr] = useState(false);

  const { requestPickupAction } = require("@/actions/orders");

  async function handleSaveAddress() {
    setSavingAddr(true);
    const fd = new FormData();
    if (newAddrLabel) fd.append("label", newAddrLabel);
    fd.append("streetLine1", newAddrStreet);
    fd.append("postalCode", newAddrPostal);
    fd.append("city", "Singapore");
    const result = await saveAddressAction(fd);
    setSavingAddr(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to save address.");
      return;
    }
    const newAddr = {
      id: result.data!.addressId,
      customerId: "",
      label: newAddrLabel || null,
      streetLine1: newAddrStreet,
      streetLine2: null,
      city: "Singapore",
      state: null,
      postalCode: newAddrPostal,
      country: "Singapore",
      isDefault: false,
      lat: null,
      lng: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Address;
    setScheduleAddresses((prev) => [...prev, newAddr]);
    setSelectedAddress(result.data!.addressId);
    setShowNewAddrForm(false);
    setNewAddrLabel("");
    setNewAddrStreet("");
    setNewAddrPostal("");
    toast.success("Address saved!");
  }

  const timeSlots = [
    { value: "09:00-11:00", label: "Morning (9am – 11am)" },
    { value: "11:00-13:00", label: "Late Morning (11am – 1pm)" },
    { value: "13:00-15:00", label: "Afternoon (1pm – 3pm)" },
    { value: "15:00-17:00", label: "Late Afternoon (3pm – 5pm)" },
    { value: "17:00-19:00", label: "Evening (5pm – 7pm)" },
  ];

  async function handleSubmit() {
    if (!selectedDate || !selectedSlot || !selectedAddress) {
      toast.error("Please select a date, time slot, and address.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("addressId", selectedAddress);
    fd.append("requestedDate", selectedDate);
    fd.append("requestedSlot", selectedSlot);
    const result = await requestPickupAction(fd);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pickup scheduled! We will confirm shortly.");
    onDone();
  }

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 0) return null; // skip Sundays
    return d;
  }).filter(Boolean) as Date[];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Pickup Date</Label>
        <Select value={selectedDate} onValueChange={(v) => { if (v !== null) setSelectedDate(v); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a date" />
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
          {timeSlots.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => setSelectedSlot(slot.value)}
              className={`border rounded-lg px-3 py-2 text-sm text-left transition-all ${
                selectedSlot === slot.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pickup Address</Label>
        <Select value={selectedAddress} onValueChange={(v) => {
          if (!v) return;
          if (v === "__new__") {
            setShowNewAddrForm(true);
          } else {
            setSelectedAddress(v);
            setShowNewAddrForm(false);
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select address">
              {scheduleAddresses.find((a) => a.id === selectedAddress)
                ? formatAddress(scheduleAddresses.find((a) => a.id === selectedAddress)!)
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {scheduleAddresses.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {formatAddress(a)}
              </SelectItem>
            ))}
            <SelectItem value="__new__">+ Add new address</SelectItem>
          </SelectContent>
        </Select>
        {showNewAddrForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <div className="space-y-1">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                placeholder="e.g. Home, Office"
                value={newAddrLabel}
                onChange={(e) => setNewAddrLabel(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Street Address *</Label>
              <Input
                placeholder="e.g. 123 Orchard Road"
                value={newAddrStreet}
                onChange={(e) => setNewAddrStreet(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Postal Code *</Label>
              <Input
                placeholder="e.g. 238867"
                value={newAddrPostal}
                onChange={(e) => setNewAddrPostal(e.target.value)}
                className="h-8 text-sm"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowNewAddrForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={!newAddrStreet || !newAddrPostal || savingAddr}
                onClick={handleSaveAddress}
              >
                {savingAddr ? "Saving..." : "Save Address"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onDone} className="flex-1">
          Skip for now
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? "Scheduling..." : "Confirm Pickup"}
        </Button>
      </div>
    </div>
  );
}
