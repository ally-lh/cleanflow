"use client";

import { useMemo, useState } from "react";
import { Sparkles, Search, SlidersHorizontal, Bot, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = "Dresses" | "Suits" | "Traditional" | "Casual" | "Outerwear";

type Listing = {
  id: string;
  name: string;
  category: Category;
  size: string;
  price: number;
  color: string;
  occasion: string;
  description: string;
};

type PriceFilter = "all" | "under-50" | "50-100" | "100-plus";

const listings: Listing[] = [
  {
    id: "R-1001",
    name: "Emerald Satin Evening Dress",
    category: "Dresses",
    size: "S-M",
    price: 84,
    color: "Emerald",
    occasion: "Gala / Dinner",
    description: "Flowing satin silhouette with soft drape for formal evenings.",
  },
  {
    id: "R-1002",
    name: "Classic Black Tuxedo",
    category: "Suits",
    size: "M-L",
    price: 120,
    color: "Black",
    occasion: "Wedding / Black tie",
    description: "Sharp tailored tuxedo with satin lapel and modern fit.",
  },
  {
    id: "R-1003",
    name: "Linen Resort Co-ord Set",
    category: "Casual",
    size: "XS-M",
    price: 45,
    color: "Sand",
    occasion: "Beach / Brunch",
    description: "Breathable two-piece linen set for warm-weather events.",
  },
  {
    id: "R-1004",
    name: "Navy Structured Blazer",
    category: "Outerwear",
    size: "S-L",
    price: 58,
    color: "Navy",
    occasion: "Business / Smart casual",
    description: "Structured blazer with versatile styling across day and night.",
  },
  {
    id: "R-1005",
    name: "Modern Kebaya Set",
    category: "Traditional",
    size: "S-M",
    price: 95,
    color: "Rose Gold",
    occasion: "Festive / Family event",
    description: "Elegant kebaya with refined embroidery and matching skirt.",
  },
  {
    id: "R-1006",
    name: "Ivory Pleated Midi Dress",
    category: "Dresses",
    size: "M-L",
    price: 72,
    color: "Ivory",
    occasion: "Garden party",
    description: "Lightweight pleated midi dress with effortless movement.",
  },
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function inPriceBand(price: number, band: PriceFilter) {
  if (band === "under-50") return price < 50;
  if (band === "50-100") return price >= 50 && price <= 100;
  if (band === "100-plus") return price > 100;
  return true;
}

function recommendFromQuery(query: string) {
  const q = query.toLowerCase();

  const scored = listings
    .map((item) => {
      let score = 0;

      if (q.includes(item.category.toLowerCase())) score += 3;
      if (q.includes(item.occasion.toLowerCase().split("/")[0].trim().toLowerCase())) score += 2;
      if (q.includes(item.color.toLowerCase())) score += 2;
      if (q.includes("budget") || q.includes("cheap") || q.includes("affordable")) {
        if (item.price < 60) score += 3;
      }
      if (q.includes("formal") || q.includes("wedding") || q.includes("gala")) {
        if (item.category === "Suits" || item.category === "Dresses" || item.category === "Traditional") score += 2;
      }
      if (q.includes("casual") || q.includes("brunch") || q.includes("day")) {
        if (item.category === "Casual" || item.category === "Outerwear") score += 2;
      }
      if (q.includes(item.name.toLowerCase())) score += 4;

      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((x) => x.score > 0).slice(0, 3).map((x) => x.item);
  return top.length > 0 ? top : listings.slice(0, 3);
}

export default function RentPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! Tell me about your event, preferred style, colors, and budget. I will recommend the best rental pieces for you.",
    },
  ]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesPrice = inPriceBand(item.price, priceFilter);
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.occasion.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q);

      return matchesCategory && matchesPrice && matchesSearch;
    });
  }, [search, category, priceFilter]);

  function handleChatSend() {
    const prompt = chatInput.trim();
    if (!prompt) return;

    const recs = recommendFromQuery(prompt);
    const recommendationText = recs
      .map((item) => `• ${item.name} (${item.category}) - SGD ${item.price}`)
      .join("\n");

    const assistantReply = `Based on your request, here are my recommendations:\n${recommendationText}\n\nWant me to narrow this down by color, fit, or budget?`;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: prompt },
      { role: "assistant", content: assistantReply },
    ]);
    setChatInput("");
  }

  return (
    <div className="space-y-6 pb-2">
      <Card className="rounded-2xl border-border/70 bg-card/85 py-0 shadow-sm">
        <CardHeader className="gap-3 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Rent Clothes</CardTitle>
              <CardDescription className="mt-1">
                Browse curated outfits for events, work, and weekends.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => setIsChatOpen((prev) => !prev)}
              className="h-9 rounded-xl"
            >
              <Bot className="mr-1.5 h-4 w-4" />
              {isChatOpen ? "Hide AI Chat" : "Chat with AI Stylist"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by style, color, event, or item name"
                className="h-10 rounded-xl pl-9"
              />
            </div>

            <Select value={category} onValueChange={(v) => v !== null && setCategory(v)}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Dresses">Dresses</SelectItem>
                <SelectItem value="Suits">Suits</SelectItem>
                <SelectItem value="Traditional">Traditional</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Outerwear">Outerwear</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceFilter} onValueChange={(v) => v !== null && setPriceFilter(v as PriceFilter)}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-36">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-50">Under SGD 50</SelectItem>
                <SelectItem value="50-100">SGD 50 - 100</SelectItem>
                <SelectItem value="100-plus">Above SGD 100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {isChatOpen && (
        <Card className="rounded-2xl border-primary/20 bg-primary/5 py-0">
          <CardHeader className="px-5 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold">AI Stylist</CardTitle>
            <CardDescription>
              Describe your event, style, and budget to get personalized picks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/80 p-3">
              {chatMessages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {msg.role === "assistant" ? "AI Stylist" : "You"}
                  </p>
                  <p className="text-sm whitespace-pre-line text-foreground">{msg.content}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Example: I need an elegant look for a wedding dinner, budget under SGD 100."
                className="min-h-20 rounded-xl bg-background"
              />
              <Button type="button" onClick={handleChatSend} className="h-10 self-end rounded-xl">
                <SendHorizonal className="mr-1.5 h-4 w-4" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {filteredListings.length} {filteredListings.length === 1 ? "listing" : "listings"} found
          </h2>
        </div>

        {filteredListings.length === 0 ? (
          <Card className="border-dashed py-0">
            <CardContent className="py-12 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No matches found. Try a different keyword, category, or price range.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {filteredListings.map((item) => (
              <Card key={item.id} className="overflow-hidden rounded-2xl border-border/70 bg-card/90 py-0 transition-shadow hover:shadow-md">
                <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-chart-2/20 p-3">
                  <Badge variant="outline" className="bg-background/80">
                    {item.category}
                  </Badge>
                </div>
                <CardContent className="space-y-2.5 px-3.5 py-3.5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{item.occasion}</Badge>
                    <Badge variant="outline">Color: {item.color}</Badge>
                    <Badge variant="outline">Size: {item.size}</Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-sm font-semibold">SGD {item.price} / rental</p>
                    <Button type="button" variant="outline" className="rounded-lg">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
