"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles, ShoppingBag, X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  items?: ClothingItem[];
  pairingSuggestions?: string[];
  showPairingPrompt?: boolean;
}

interface ClothingItem {
  id: number;
  image_path: string;
  category: string;
  similarity: number;
  brand?: string;
  price?: number;
}

interface StyleChatbotProps {
  onClose?: () => void;
}

const STORAGE_KEY = "cleanflow_style_chat_history";

export default function StyleChatbot({ onClose }: StyleChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPairing, setShowPairing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const history = JSON.parse(saved);
        setMessages(history);
      } catch {
        setMessages([
          {
            id: "1",
            role: "assistant",
            content:
              "Hi! I'm your style assistant. Tell me about the occasion, style, or colors you're looking for, and I'll recommend perfect outfits for you!",
          },
        ]);
      }
    } else {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content:
            "Hi! I'm your style assistant. Tell me about the occasion, style, or colors you're looking for, and I'll recommend perfect outfits for you!",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowPairing(false);

    try {
      const response = await fetch("/api/style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
          current_items: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I couldn't find any matching items.",
        items: data.items || [],
        pairingSuggestions: data.pairing_suggestions || [],
        showPairingPrompt: data.suggest_pairing || false,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting to the style service. Please make sure the Python server is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePairingResponse = async (wants: boolean) => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || !lastMessage.showPairingPrompt) return;

    if (wants) {
      setShowPairing(true);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "No problem! Let me know if you'd like to search for something else or have any other questions.",
        },
      ]);
    }
  };

  const clearHistory = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm your style assistant. Tell me about the occasion, style, or colors you're looking for, and I'll recommend perfect outfits for you!",
      },
    ]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">Style Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            Clear
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                {msg.items && msg.items.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {msg.items.map((item) => (
                      <a
                        key={item.id}
                        href={`/catalog/${item.id}`}
                        className="block bg-white rounded p-2 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="relative w-full aspect-square bg-gray-100 rounded overflow-hidden">
                          <img
                            src={`/api/style/image?path=${encodeURIComponent(
                              item.image_path
                            )}`}
                            alt={item.category}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-center mt-1 font-medium">
                          {item.category}
                        </p>
                        <p className="text-xs text-center text-purple-600 font-semibold">
                          SGD {item.price}/day
                        </p>
                        <p className="text-[10px] text-center text-gray-500">
                          {Math.round(item.similarity * 100)}% match
                        </p>
                      </a>
                    ))}
                  </div>
                )}

                {msg.showPairingPrompt && !showPairing && (
                  <div className="mt-3 flex gap-2">
                    <p>Want me to recommend pairings to go with this?</p>
                    <Button
                      size="sm"
                      onClick={() => handlePairingResponse(true)}
                    >
                      Yes, show me!
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePairingResponse(false)}
                    >
                      Maybe later
                    </Button>
                  </div>
                )}

                {showPairing && msg.pairingSuggestions && (
                  <div className="mt-3 bg-white/90 rounded p-3">
                    <p className="text-sm font-medium text-purple-700 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      Perfect pairings:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {msg.pairingSuggestions.map((suggestion, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-gray-700 flex items-start gap-1"
                        >
                          <span className="text-purple-500">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="min-h-[44px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
