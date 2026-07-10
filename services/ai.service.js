export async function sendChat(messages) {
  const response = await fetch("/api/ai/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "AI Error");
  }

  return data;
}