import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types/constants";
import type { OrderStatus } from "@prisma/client";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={ORDER_STATUS_COLORS[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
