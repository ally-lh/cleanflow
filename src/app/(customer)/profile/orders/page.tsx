"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { ChevronLeft } from "lucide-react";
import type { Order } from "@/types";

export default function AllOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchAllOrders();
    }
  }, [status, router]);

  const fetchAllOrders = async () => {
    try {
      // TODO: Create API endpoint to fetch user's all orders
      setAllOrders([]);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg w-1/3" />
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <div className="text-center py-12">Please log in to view your orders</div>;
  }

  // Separate ongoing and completed orders
  const ongoingOrders = allOrders.filter(
    (order) =>
      order.status !== "COMPLETED" && order.status !== "CANCELLED"
  );
  const completedOrders = allOrders.filter(
    (order) => order.status === "COMPLETED" || order.status === "CANCELLED"
  );

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/profile")}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
      </div>

      {allOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
          <Link href="/cart">
            <Button>Start Your First Order</Button>
          </Link>
        </Card>
      ) : (
        <Tabs defaultValue="ongoing" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="ongoing">
              Ongoing ({ongoingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="space-y-4 mt-6">
            {ongoingOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">No ongoing orders</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ongoingOrders.map((order) => (
                  <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                    <Link href={`/orders/${order.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            Order {order.orderNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          {order.serviceType && (
                            <p className="text-xs text-gray-500 mt-1">
                              {order.serviceType.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {completedOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">No completed orders yet</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {completedOrders.map((order) => (
                  <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                    <Link href={`/orders/${order.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            Order {order.orderNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          {order.completedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Completed{" "}
                              {new Date(order.completedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
