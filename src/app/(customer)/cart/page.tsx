"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ShoppingBag, Trash2 } from "lucide-react";
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

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems, mounted]);

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const total = cartItems.reduce((sum, item) => sum + item.pricePerMonth, 0);
  const subscriptionDiscount = cartItems.length >= 3 ? total * 0.25 : 0;
  const finalTotal = total - subscriptionDiscount;

  if (!mounted) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/catalog">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <Badge variant="secondary" className="ml-auto">
          {cartItems.length} items
        </Badge>
      </div>

      {cartItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link href="/catalog">
              <Button>Browse Catalog</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">{item.brand}</p>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">Size: {item.size}</p>
                      <p className="font-semibold text-purple-600">
                        SGD {item.pricePerMonth}/month
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>SGD {total.toFixed(2)}</span>
              </div>
              
              {subscriptionDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Subscription Discount (25% - 3+ items)</span>
                  <span>- SGD {subscriptionDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg border-t pt-4">
                <span>Total</span>
                <span>SGD {finalTotal.toFixed(2)}/month</span>
              </div>

              {cartItems.length < 3 && (
                <p className="text-sm text-gray-500">
                  Add {3 - cartItems.length} more items to get 25% discount!
                </p>
              )}

              <Link href="/checkout">
                <Button className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
              </Link>

              <Button variant="outline" className="w-full" onClick={clearCart}>
                Clear Cart
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
