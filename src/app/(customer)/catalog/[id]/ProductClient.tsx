"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface ProductItem {
  id: number;
  image_path: string;
  category_name: string;
  brand: string;
  price: number;
  subscription_price: number;
  sizes: string[];
  description: string;
}

interface Props {
  item: ProductItem;
}

const CART_KEY = "cleanflow_cart";

export default function ProductClient({ item }: Props) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [added, setAdded] = useState(false);

  const addToCart = () => {
    if (!selectedSize) return;
    
    const cartItem = {
      id: item.id.toString(),
      name: item.category_name,
      imageUrl: `/api/style/image?path=${encodeURIComponent(item.image_path)}`,
      brand: item.brand,
      pricePerMonth: item.price,
      size: selectedSize,
    };

    const existing = localStorage.getItem(CART_KEY);
    const cart = existing ? JSON.parse(existing) : [];
    cart.push(cartItem);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!item) {
    return <div>Item not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={`/api/style/image?path=${encodeURIComponent(item.image_path)}`}
            alt={item.category_name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500">{item.brand}</p>
            <h1 className="text-2xl font-bold text-gray-900">{item.category_name}</h1>
            <p className="text-gray-600 mt-2">{item.description}</p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">30 days Rental</p>
                <p className="text-2xl font-bold text-purple-600">SGD {item.price}</p>
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

          <div>
            <p className="text-sm font-medium mb-2">Select Size</p>
            <div className="flex gap-2">
              {item.sizes.map(size => (
                <Button
                  key={size}
                  variant={selectedSize === size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-500">Category: {item.category_name}</p>
            <p className="text-sm text-gray-500">Brand: {item.brand}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
