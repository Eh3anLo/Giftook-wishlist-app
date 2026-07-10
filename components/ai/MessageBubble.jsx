import GiftRecommendationMessage from "./GiftRecommendationMessage";
import { MESSAGE_TYPES } from "@/lib/chat-message";

export default function MessageBubble({ message }) {
  if (message.type === MESSAGE_TYPES.GIFT_RECOMMENDATIONS) {
    return <GiftRecommendationMessage data={message.data} />;
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}