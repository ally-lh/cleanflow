"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Calendar } from "lucide-react";
import Link from "next/link";

interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  brand: string;
  pricePerMonth: number;
  size: string;
}

const CART_KEY = "cleanflow_cart";

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState("MONTHLY");
  const [startDate, setStartDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch {
        setCartItems([]);
      }
    }
  }, []);

  const total = cartItems.reduce((sum, item) => sum + item.pricePerMonth, 0);
  const discount = cartItems.length >= 3 ? total * 0.25 : 0;
  const finalTotal = total - discount;

  const getDiscountedTotal = () => {
    if (subscriptionType === "QUARTERLY") return finalTotal * 0.95 * 3;
    if (subscriptionType === "YEARLY") return finalTotal * 0.85 * 12;
    return finalTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      localStorage.removeItem(CART_KEY);
      router.push("/checkout/success");
    }, 1500);
  };

  if (!mounted) return null;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Link href="/catalog">
          <Button>Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cart">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} ({item.size})</span>
                    <span>SGD {item.pricePerMonth}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>SGD {total.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount (3+ items)</span>
                    <span>- SGD {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>SGD {finalTotal.toFixed(2)}/month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Subscription Plan</h2>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={subscriptionType === "MONTHLY" ? "default" : "outline"}
                  onClick={() => setSubscriptionType("MONTHLY")}
                  className="w-full"
                >
                  <div className="text-center">
                    <div className="font-bold">Monthly</div>
                    <div className="text-xs opacity-80">SGD {finalTotal.toFixed(0)}/mo</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={subscriptionType === "QUARTERLY" ? "default" : "outline"}
                  onClick={() => setSubscriptionType("QUARTERLY")}
                  className="w-full"
                >
                  <div className="text-center">
                    <div className="font-bold">Quarterly</div>
                    <div className="text-xs opacity-80">5% off</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={subscriptionType === "YEARLY" ? "default" : "outline"}
                  onClick={() => setSubscriptionType("YEARLY")}
                  className="w-full"
                >
                  <div className="text-center">
                    <div className="font-bold">Yearly</div>
                    <div className="text-xs opacity-80">15% off</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Start Date</h2>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
            {isProcessing ? "Processing..." : `Confirm - SGD ${getDiscountedTotal().toFixed(2)}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
