export function extractJson(text) {
  if (!text) {
    throw new Error("Empty AI response");
  }

  // اگر داخل ```json ``` باشد
  const markdownMatch = text.match(
    /```(?:json)?\s*([\s\S]*?)```/
  );

  if (markdownMatch) {
    return markdownMatch[1].trim();
  }

  // پیدا کردن اولین {
  const firstBrace = text.indexOf("{");

  // پیدا کردن آخرین }
  const lastBrace = text.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    return text.slice(
      firstBrace,
      lastBrace + 1
    );
  }

  throw new Error("No JSON found");
}