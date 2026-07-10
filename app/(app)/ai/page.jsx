"use client"

import { useState } from "react"
import { generateGiftIdeas } from "@/services/ai.service"
import PromptInput from "@/components/ai/PromptInput"
import RecommendationList from "@/components/ai/RecommendationList"
import ProfileSummary from "@/components/ai/ProfileSummary"
import ChatWindow from "@/components/ai/ChatWindow"
import { sendChat } from "@/services/ai.service"
import { MESSAGE_TYPES } from "@/lib/chat-message"

export default function AIPage() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      type: MESSAGE_TYPES.TEXT,
      content:
        "سلام 👋 من دستیار پیشنهاد هدیه هستم. هر اطلاعاتی درباره شخص موردنظر داری برام بنویس.",
    },
  ])

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  async function handleSend() {
    if (!input.trim()) return

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      type: MESSAGE_TYPES.TEXT,
      content: input,
    }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)

    setInput("")

    try {
      setLoading(true)

      const assistantMessage = await sendChat(updatedMessages)

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // async function handleGenerate() {
  //   try {
  //     setLoading(true)
  //     console.log("hello")
  //     const data = await generateGiftIdeas(prompt)

  //     setResult(data)
  //   } catch (error) {
  //     console.error(error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  return (
    <ChatWindow
      messages={messages}
      input={input}
      setInput={setInput}
      onSend={handleSend}
      loading={loading}
    />
  )
}
