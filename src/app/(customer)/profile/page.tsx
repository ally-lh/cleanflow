"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { Settings, HelpCircle } from "lucide-react";
import type { Order } from "@/types";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ongoingOrders, setOngoingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // For now, use static test data - in production, fetch from API
  const userPoints = 1250;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      // Fetch ongoing orders
      fetchOngoingOrders();
    }
  }, [status, router]);

  const fetchOngoingOrders = async () => {
    try {
      // TODO: Create API endpoint to fetch user's orders
      setOngoingOrders([]);
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
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <div className="text-center py-12">Please log in to view your profile</div>;
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {session.user.name || "User Profile"}
          </h1>
          <p className="text-gray-600 mt-1">{session.user.email}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          title="Go to settings"
          onClick={() => router.push("/settings")}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Points Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Your Points
            </h2>
            <p className="text-4xl font-bold text-blue-600">{userPoints}</p>
            <p className="text-sm text-gray-600 mt-1">
              Earn points with every order and redeem for discounts
            </p>
          </div>
          <Dialog>
            <DialogTrigger className="h-12 w-12 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How Our Points System Works</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <strong className="text-foreground">Earn Points:</strong> You earn 1 point for every dollar spent on orders. 
                  Bonus points are awarded for referring friends.
                </div>
                <div>
                  <strong className="text-foreground">Redemption:</strong> Points are automatically applied to your eligible orders 
                  at checkout. They never expire as long as you maintain an active account.
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <Separator />

      {/* Ongoing Orders */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ongoing Orders</h2>

        {ongoingOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">
              You don't have any ongoing orders right now.
            </p>
            <Button onClick={() => router.push("/cart")}>
              Start a New Order
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ongoingOrders.map((order) => (
              <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                <Link href={`/orders/${order.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Order {order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View All Orders Link */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push("/profile/orders")}
        >
          View All Orders
        </Button>
      </div>
    </div>
  );
}
