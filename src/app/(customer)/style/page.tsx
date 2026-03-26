"use client";

import StyleChatbot from "@/components/customer/StyleChatbot";
import { useEffect } from "react";

const STORAGE_KEY = "cleanflow_style_chat_history";

export default function StylePage() {
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Style Assistant</h1>
        <p className="text-gray-500">
          Get personalized outfit recommendations for any occasion
        </p>
      </div>
      <div className="h-[calc(100%-4rem)]">
        <StyleChatbot />
      </div>
    </div>
  );
}
