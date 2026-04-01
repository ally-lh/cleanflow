"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { RentalItem } from "@/data/rentalCatalog";

interface Props {
  item: RentalItem;
}

const CART_KEY = "cleanflow_cart";

type SimilarItem = {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  color: string;
  occasion: string;
  keywordPercent: number;
  clipPercent: number;
  finalPercent: number;
};

export default function RentProductClient({ item }: Props) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [added, setAdded] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
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

  useEffect(() => {
    async function fetchSimilarItems() {
      setLoadingSimilar(true);
      try {
        const query = `${item.color} ${item.category} ${item.occasion}`;
        const response = await fetch("/api/rent-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.items && Array.isArray(data.items)) {
            const filtered = data.items
              .filter((i: { id: string }) => i.id !== item.id)
              .slice(0, 3)
              .map((i: { 
                id: string; 
                name: string; 
                image: string; 
                category: string; 
                price: number; 
                color: string; 
                occasion: string;
                keywordPercent: number;
                clipPercent: number;
                finalPercent: number;
              }) => ({
                id: i.id,
                name: i.name,
                image: i.image,
                category: i.category,
                price: i.price,
                color: i.color,
                occasion: i.occasion,
                keywordPercent: i.keywordPercent || 0,
                clipPercent: i.clipPercent || 0,
                finalPercent: i.finalPercent || 0,
              }));
            setSimilarItems(filtered);
          }
        }
      } catch (error) {
        console.error("Error fetching similar items:", error);
      } finally {
        setLoadingSimilar(false);
      }
    }

    fetchSimilarItems();
  }, [item]);

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

      {(similarItems.length > 0 || loadingSimilar) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">You May Also Like</h2>
            </div>
            
            {loadingSimilar ? (
              <p className="text-sm text-muted-foreground">Finding similar items...</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {similarItems.map((simItem) => (
                  <Link
                    key={simItem.id}
                    href={`/rent/${simItem.id}`}
                    className="block"
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer pt-0">
                      <div className="w-full h-80">
                        <img
                          src={simItem.image}
                          alt={simItem.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-2 space-y-1">
                        <p className="text-xs font-medium line-clamp-1">{simItem.name}</p>
                        <p className="text-xs text-primary font-semibold">SGD {simItem.price}</p>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {simItem.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
