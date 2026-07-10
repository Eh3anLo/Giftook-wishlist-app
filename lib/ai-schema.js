import { z } from "zod";

const PriceSchema = z.object({
  value: z.number(),
  currency: z.string(),
});

const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
  estimatedPrice: PriceSchema,
  searchKeywords: z.array(z.string()),
});

const ProfileSchema = z.object({
  relationship: z.string(),
  estimatedAge: z.number(),
  budget: PriceSchema,
  personality: z.array(z.string()),
  interests: z.array(z.string()),
  occasion: z.string(),
});

export const AIRecommendationSchema = z.object({
  type: z.literal("recommendation"),
  profile: ProfileSchema,
  recommendations: z.array(RecommendationSchema),
});

export const AIQuestionSchema = z.object({
  type: z.literal("question"),
  question: z.string(),
});


export const AIResponseSchema = z.union([
  AIQuestionSchema,
  AIRecommendationSchema,
]);