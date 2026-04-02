"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteDraftOrderAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";

interface Props {
  orderId: string;
  orderNumber: string;
  redirectTo?: string;
  className?: string;
}

export default function DeleteDraftOrderButton({
  orderId,
  orderNumber,
  redirectTo,
  className,
}: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete draft order ${orderNumber}? This cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteDraftOrderAction(orderId);
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Draft order deleted.");

    if (redirectTo) {
      router.push(redirectTo);
      return;
    }

    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      className={className}
      disabled={isDeleting}
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isDeleting ? "Deleting..." : "Delete Draft"}
    </Button>
  );
}
