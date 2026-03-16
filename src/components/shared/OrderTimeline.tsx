// Visual order progress tracker — shown to both customers and admins

import type { OrderStatus, OrderStatusHistory } from "@prisma/client";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/types/constants";
import { cn } from "@/lib/utils";

interface Props {
  currentStatus: OrderStatus;
  history: OrderStatusHistory[];
}

export default function OrderTimeline({ currentStatus, history }: Props) {
  const currentStep = ORDER_STATUS_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        This order has been cancelled.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Progress</h3>
      <div className="flex items-start gap-0">
        {ORDER_STATUS_STEPS.map((step, index) => {
          const isDone = currentStep > index;
          const isCurrent = currentStep === index;
          const histEntry = history.find((h) => h.status === step);

          return (
            <div key={step} className="flex-1 flex flex-col items-center">
              {/* Dot + connector */}
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isDone || isCurrent ? "bg-blue-500" : "bg-gray-200"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                    isDone
                      ? "bg-blue-500 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {isDone ? "✓" : index + 1}
                </div>
                {index < ORDER_STATUS_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isDone ? "bg-blue-500" : "bg-gray-200"
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className="mt-2 text-center px-1">
                <p
                  className={cn(
                    "text-xs leading-tight",
                    isCurrent
                      ? "font-semibold text-blue-700"
                      : isDone
                      ? "text-gray-600"
                      : "text-gray-400"
                  )}
                >
                  {ORDER_STATUS_LABELS[step]}
                </p>
                {histEntry && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(histEntry.createdAt).toLocaleDateString("en-SG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
