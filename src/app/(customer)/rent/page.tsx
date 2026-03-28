"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Sparkles, Search, SlidersHorizontal, Bot, SendHorizonal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { rentalCatalog } from "@/data/rentalCatalog";

type PriceFilter = "all" | "under-50" | "50-100" | "100-plus";

type RecommendedItem = {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  color: string;
  occasion: string;
  brand: string;
  description: string;
  keywordPercent: number;
  clipPercent: number;
  finalPercent: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  items?: RecommendedItem[];
  queryType?: string;
  weights?: { keyword: number; clip: number };
};

function inPriceBand(price: number, band: PriceFilter) {
  if (band === "under-50") return price < 50;
  if (band === "50-100") return price >= 50 && price <= 100;
  if (band === "100-plus") return price > 100;
  return true;
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
      content: "Hi! Tell me about your event, preferred style, colors, and budget. I will recommend the best rental pieces for you.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(rentalCatalog.map((item) => item.category)));
    return cats.sort();
  }, []);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rentalCatalog.filter((item) => {
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isLoading]);

  async function handleChatSend() {
    const prompt = chatInput.trim();
    if (!prompt) return;

    setIsLoading(true);
    const userMessage: ChatMessage = { role: "user", content: prompt };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");

    try {
      const response = await fetch("/api/rent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response || "I couldn't find any items matching your description.",
        items: data.items || [],
        queryType: data.queryType,
        weights: data.weights,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-2">
      <Card className="rounded-2xl border-border/70 bg-card/85 py-0 shadow-sm">
        <CardHeader className="gap-3 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Rent Clothes</CardTitle>
              <CardDescription className="mt-1">
                Browse curated outfits for events, work, and weekends. Test out different styles and rent clothings at reasonable prices!
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
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
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
            <div 
              ref={chatContainerRef}
              className="max-h-[400px] space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-background/80 p-3"
            >
              {chatMessages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {msg.role === "assistant" ? "AI Stylist" : "You"}
                  </p>
                  <p className="text-sm whitespace-pre-line text-foreground">{msg.content}</p>
                  
                  {msg.role === "assistant" && msg.items && msg.items.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        Match Score: Total (Keyword + Visual)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {msg.items.map((item, index) => (
                          <Link
                            key={item.id}
                            href={`/rent/${item.id}`}
                            className="block"
                          >
                            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative">
                              {index === 0 && (
                                <div className="absolute top-1 left-1 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  TOP
                                </div>
                              )}
                              <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/5 to-chart-2/20">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-2 space-y-1">
                                <p className="text-xs font-medium line-clamp-1">{item.name}</p>
                                <p className="text-xs text-primary font-semibold">SGD {item.price}</p>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {item.category}
                                  </Badge>
                                </div>
                                <div className="pt-1 border-t mt-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-semibold text-foreground">
                                      {item.finalPercent}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5">
                                    <span>KW: {item.keywordPercent}%</span>
                                    <span>VIS: {item.clipPercent}%</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Finding the perfect items for you...</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Example: I need an elegant look for a wedding dinner, budget under SGD 100."
                className="min-h-20 rounded-xl bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleChatSend}
                className="h-10 self-end rounded-xl"
                disabled={isLoading || !chatInput.trim()}
              >
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filteredListings.map((item) => (
              <Link href={`/rent/${item.id}`} key={item.id}>
                <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/90 py-0 transition-shadow hover:shadow-md cursor-pointer h-full">
                  <div className="relative aspect-square bg-gradient-to-br from-primary/20 via-primary/5 to-chart-2/20">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <Badge variant="outline" className="absolute top-2 left-2 bg-background/80">
                      {item.category}
                    </Badge>
                  </div>
                  <CardContent className="space-y-2.5 px-3.5 py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{item.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="secondary" className="text-xs">{item.occasion}</Badge>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-sm font-semibold">SGD {item.price} / rental</p>
                      <span className="text-xs text-muted-foreground">{item.color}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
