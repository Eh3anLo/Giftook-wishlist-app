import { AIResponseSchema } from "./ai-schema";

export function validateAIResponse(data) {
  return AIResponseSchema.parse(data);
}