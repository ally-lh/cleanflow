"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface CatalogItem {
  id: number;
  image_path: string;
  category_label: number;
  category_name: string;
  brand: string;
  price: number;
  sizes: string[];
  description: string;
}

interface Props {
  initialItems: CatalogItem[];
}

export default function CatalogClient({ initialItems }: Props) {
  const [category, setCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");

  const brands = Array.from(new Set(initialItems.map(i => i.brand))).sort();

  const filteredItems = useMemo(() => {
    let result = [...initialItems];

    if (category !== "all") {
      result = result.filter(item => item.category_name.toLowerCase() === category);
    }

    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number);
      result = result.filter(item => item.price >= min && item.price <= max);
    }

    if (brand !== "all") {
      result = result.filter(item => item.brand === brand);
    }

    return result;
  }, [initialItems, category, priceRange, brand]);

  const resetFilters = () => {
    setCategory("all");
    setPriceRange("all");
    setBrand("all");
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rental Catalog</h1>
        <p className="text-gray-500 mt-1">
          Browse our collection,  test out different styles and rent clothings at reasonable prices!
        </p>
      </div>

      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
        <span className="self-center">Category</span>
        <Select value={category} onValueChange={(v) => setCategory(v || "all")}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="dress">Dress</SelectItem>
            <SelectItem value="jumpsuit">Jumpsuit</SelectItem>
            <SelectItem value="romper">Romper</SelectItem>
          </SelectContent>
        </Select>

      <span className="self-center">Price</span>
        <Select value={priceRange} onValueChange={(v) => setPriceRange(v || "all")}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="20-40">$20 - $40</SelectItem>
            <SelectItem value="40-60">$40 - $60</SelectItem>
            <SelectItem value="60-80">$60 - $80</SelectItem>
          </SelectContent>
        </Select>

    <span className="self-center">Brand</span>
        <Select value={brand} onValueChange={(v) => setBrand(v || "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={resetFilters}>
          Clear Filters
        </Button>

        <span className="ml-auto text-sm text-gray-500 self-center">
          {filteredItems.length} items
        </span>
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No items match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <Link href={`/catalog/${item.id}`} key={item.id}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className="relative px-10 w-full h-100 aspect-square bg-white-100 rounded overflow-hidden">
                  <img
                    src={`/api/style/image?path=${encodeURIComponent(item.image_path)}`}
                    alt={item.category_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-500">{item.brand}</p>
                  <p className="text-sm font-medium">{item.category_name}</p>
                  <p className="text-sm font-semibold text-purple-600">
                    SGD {item.price}/month
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/style"
        className="fixed bottom-6 right-6 bg-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium z-50"
      >
        <Sparkles className="w-4 h-4" />
        Not sure what to pick? Ask our AI style assistant.
      </Link>
    </div>
  );
}