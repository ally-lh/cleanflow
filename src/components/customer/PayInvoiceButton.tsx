"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { payInvoiceAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";

interface Props {
  orderId: string;
  amount: number;
}

export default function PayInvoiceButton({ orderId, amount }: Props) {
  const router = useRouter();
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay() {
    setIsPaying(true);
    const result = await payInvoiceAction(orderId);
    setIsPaying(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(`Payment of SGD ${amount.toFixed(2)} received.`);
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      className="w-full sm:w-auto"
      disabled={isPaying}
      onClick={handlePay}
    >
      <CreditCard className="h-4 w-4" />
      {isPaying ? "Processing..." : `Pay SGD ${amount.toFixed(2)}`}
    </Button>
  );
}
