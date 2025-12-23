import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from "@/lib/types";
import { analyzeFoodImage } from "@/lib/vision";
import { lookupNutrition } from "@/lib/usda";
import { estimatePortion, estimateCalories, round, applyPortionFactor } from "@/lib/portion";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AnalyzeRequestSchema.parse(body);
    const apiKey = process.env.OPENAI_API_KEY;
    const usdaKey = process.env.USDA_API_KEY;

    const visionResult = await analyzeFoodImage(parsed.imageBase64, apiKey);
    const items = await Promise.all(
      visionResult.foods.map(async (food) => {
        const nutrition = await lookupNutrition(food.name, usdaKey);
        const portion = estimatePortion(food.name, food.bbox);
        const adjustedGrams = applyPortionFactor(portion.grams, food.portionFactor);
        const calories = estimateCalories(adjustedGrams, nutrition);

        return {
          name: food.name,
          confidence: food.confidence,
          portion: {
            grams: round(adjustedGrams),
            method: portion.method,
            range_grams: [
              round(portion.rangeGrams[0] * (food.portionFactor ?? 1)),
              round(portion.rangeGrams[1] * (food.portionFactor ?? 1))
            ]
          },
          calories: {
            value: round(calories.value),
            range: [round(calories.range[0]), round(calories.range[1])],
            per100g: nutrition.per100g,
            source: calories.source
          },
          servingGrams: portion.servingGrams,
          servingLabel: portion.servingLabel
        };
      })
    );

    const totalValue = items.reduce((sum, item) => sum + item.calories.value, 0);
    const totalLow = items.reduce((sum, item) => sum + item.calories.range[0], 0);
    const totalHigh = items.reduce((sum, item) => sum + item.calories.range[1], 0);

    const response = {
      items,
      totalCalories: {
        value: round(totalValue),
        range: [round(totalLow), round(totalHigh)]
      }
    };

    AnalyzeResponseSchema.parse(response);

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        items: [],
        totalCalories: { value: 0, range: [0, 0] }
      },
      { status: 200 }
    );
  }
}
