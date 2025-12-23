import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  imageBase64: z.string().min(10)
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const FoodBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
});

export const VisionFoodSchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: FoodBoxSchema.optional(),
  portionFactor: z.number().min(0.3).max(3).optional()
});

export const AnalyzeItemSchema = z.object({
  name: z.string(),
  confidence: z.number(),
  portion: z.object({
    grams: z.number(),
    method: z.enum(["reference_object", "default_serving", "user_edit"]),
    range_grams: z.tuple([z.number(), z.number()])
  }),
  calories: z.object({
    value: z.number(),
    range: z.tuple([z.number(), z.number()]),
    per100g: z.number(),
    source: z.enum(["USDA", "fallback"])
  }),
  servingGrams: z.number().optional(),
  servingLabel: z.string().optional()
});

export const AnalyzeResponseSchema = z.object({
  items: z.array(AnalyzeItemSchema),
  totalCalories: z.object({
    value: z.number(),
    range: z.tuple([z.number(), z.number()])
  })
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export type HistoryEntry = {
  id: string;
  timestamp: string;
  thumbnailDataUrl: string;
  items: AnalyzeResponse["items"];
  totalCalories: AnalyzeResponse["totalCalories"];
};

export type NutritionLookup = {
  name: string;
  per100g: number;
  servingGrams: number;
  servingLabel: string;
  source: "USDA" | "fallback";
};
