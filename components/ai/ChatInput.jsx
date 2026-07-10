"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({
  value,
  onChange,
  onSend,
  loading,
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-3">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="درباره شخص مورد نظر بنویس..."
          className="min-h-14"
        />

        <Button
          onClick={onSend}
          disabled={loading}
        >
          ارسال
        </Button>
      </div>
    </div>
  );
}