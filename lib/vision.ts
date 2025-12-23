import { z } from "zod";
import { FoodBoxSchema, VisionFoodSchema } from "./types";

const VisionResponseSchema = z.object({
  foods: z.array(VisionFoodSchema),
  plate: z
    .object({
      visible: z.boolean().optional(),
      diameter_cm: z.number().optional()
    })
    .optional()
});

export type VisionResult = z.infer<typeof VisionResponseSchema>;

export async function analyzeFoodImage(imageBase64: string, apiKey?: string): Promise<VisionResult> {
  if (!apiKey) {
    return { foods: [] };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a vision assistant. Return JSON with foods detected, confidence 0-1, optional bounding boxes, and a portionFactor per item based on plate size (1.0 = typical serving). Include plate visibility and estimated diameter if possible."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify foods in this photo. Respond with JSON: {foods:[{name, confidence, bbox:{x,y,width,height}, portionFactor}], plate:{visible, diameter_cm}}. If bbox or plate details are unclear, omit them. Estimate portionFactor using plate size cues."
            },
            {
              type: "image_url",
              image_url: { url: imageBase64 }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("Vision request failed");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No vision response");
  }

  const parsed = VisionResponseSchema.parse(JSON.parse(content));
  return parsed;
}
