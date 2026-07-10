import OpenAI from "openai";

console.log(process.env.OPENROUTER_API_KEY)
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
