import MessageBubble from "./MessageBubble";

export default function ChatMessages({
  messages,
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-6">
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
        />
      ))}
    </div>
  );
}