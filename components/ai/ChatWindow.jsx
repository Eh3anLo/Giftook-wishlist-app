"use client";

import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

export default function ChatWindow({
  messages,
  input,
  setInput,
  onSend,
  loading,
}) {
  return (
    <div className="flex h-[75vh] flex-col rounded-xl border bg-background">
      <ChatMessages messages={messages} />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={onSend}
        loading={loading}
      />
    </div>
  );
}