"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, ArrowLeft, Sparkles, Upload, Camera } from "lucide-react";
import Link from "next/link";
import { RentalItem } from "@/data/rentalCatalog";

interface Props {
  item: RentalItem;
}

const CART_KEY = "cleanflow_cart";

export default function RentProductClient({ item }: Props) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [added, setAdded] = useState(false);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnMode, setTryOnMode] = useState<"upload" | "camera" | null>(null);
  const [tryOnStep, setTryOnStep] = useState<"select" | "preview" | "loading" | "result">("select");
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

  const openTryOn = () => {
    setTryOnOpen(true);
    setTryOnMode(null);
    setTryOnStep("select");
  };

  const closeTryOn = (open: boolean) => {
    setTryOnOpen(open);
    if (!open) {
      setTryOnMode(null);
      setTryOnStep("select");
    }
  };

  const handleUploadSelected = () => {
    setTryOnMode("upload");
    setTryOnStep("preview");
  };

  const handleRunTryOn = () => {
    setTryOnStep("loading");
    setTimeout(() => {
      setTryOnStep("result");
    }, 1600);
  };

  const handleLiveCamera = () => {
    setTryOnMode("camera");
    setTryOnStep("result");
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

              <Button className="w-full" size="lg" variant="outline" onClick={openTryOn}>
                <Sparkles className="w-4 h-4" />
                Try it on
              </Button>
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

      <Dialog open={tryOnOpen} onOpenChange={closeTryOn}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Try It On</DialogTitle>
            <DialogDescription>
              Upload an image of yourself or use live camera to preview this look.
            </DialogDescription>
          </DialogHeader>

          {tryOnStep === "select" ? (
            <div className="space-y-3">
              <Button
                className="w-full items-center justify-center"
                variant="outline"
                onClick={handleUploadSelected}
              >
                <Upload className="mr-1 h-4 w-4" />
                Upload Image
              </Button>
              <Button className="w-full items-center justify-center" variant="outline" onClick={handleLiveCamera}>
                <Camera className="mr-1 h-4 w-4" />
                Use Live Camera
              </Button>
            </div>
          ) : null}

          {tryOnStep === "preview" ? (
            <div className="space-y-3">
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Image uploaded successfully.
              </p>
              <div className="overflow-hidden rounded-xl border">
                <img
                  src="/tryOnFeature/test1.png"
                  alt="Uploaded source preview"
                  className="h-80 w-full object-cover"
                />
              </div>
              <Button className="w-full" onClick={handleRunTryOn}>
                <Sparkles className="mr-2 h-4 w-4" />
                Try it on
              </Button>
            </div>
          ) : null}

          {tryOnStep === "loading" ? (
            <div className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse bg-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Projecting the 3D clothing model onto your image...
              </p>
            </div>
          ) : null}

          {tryOnStep === "result" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {tryOnMode === "camera"
                  ? "Live camera AR preview (mocked)."
                  : "Try-on result generated (mocked)."}
              </p>
              <div className="overflow-hidden rounded-xl border">
                <img
                  src="/tryOnFeature/test2.png"
                  alt="Try-on result preview"
                  className="h-80 w-full object-cover"
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
