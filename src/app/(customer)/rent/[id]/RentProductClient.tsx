"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RentalItem } from "@/data/rentalCatalog";

interface Props {
  item: RentalItem;
}

const CART_KEY = "cleanflow_cart";

export default function RentProductClient({ item }: Props) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const addToCart = () => {
    if (!selectedSize) return;

    const cartItem = {
      id: item.id,
      name: item.name,
      imageUrl: item.image,
      brand: item.brand,
      pricePerMonth: item.price,
      size: selectedSize,
      type: "rental",
    };

    const existing = localStorage.getItem(CART_KEY);
    const cart = existing ? JSON.parse(existing) : [];
    
    const existingIndex = cart.findIndex(
      (c: { id: string; size: string }) => c.id === item.id && c.size === selectedSize
    );
    
    if (existingIndex >= 0) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      return;
    }
    
    cart.push(cartItem);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/rent"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Rent
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/5 to-chart-2/20 rounded-2xl overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{item.category}</Badge>
              <Badge variant="secondary">{item.brand}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
            <p className="mt-2 text-muted-foreground">{item.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">Color: {item.color}</Badge>
            <Badge variant="secondary" className="text-sm">Occasion: {item.occasion}</Badge>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">30 days Rental</p>
                <p className="text-xl font-bold text-primary">SGD {item.price}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {item.sizes.map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSize(size)}
                      className="min-w-[48px]"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              {added ? (
                <Button className="w-full" size="lg" disabled>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Added to Cart!
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={addToCart}
                  disabled={!selectedSize}
                >
                  {selectedSize ? "Add to Cart" : "Select a Size"}
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Size:</span> {item.size}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Rental Period:</span> 30 days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
