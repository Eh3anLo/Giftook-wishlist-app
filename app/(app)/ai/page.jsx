"use client";

import { useState } from "react";

import ChatLayout from "@/components/ai/ChatLayout";
import ChatMessages from "@/components/ai/ChatMessages";
import ChatInput from "@/components/ai/PromptInput";

export default function AIPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text) {
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: text,
      },
    ];

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.message,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "خطایی در ارتباط با هوش مصنوعی رخ داد.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ChatLayout>
      <ChatMessages
        messages={messages}
        loading={loading}
      />

      <ChatInput onSend={sendMessage} />
    </ChatLayout>
  );
}