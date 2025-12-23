import type { NutritionLookup } from "./types";
import { findFallbackFood } from "./nutrition";

const USDA_ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";

export async function lookupNutrition(query: string, apiKey?: string): Promise<NutritionLookup> {
  const fallback = findFallbackFood(query);
  if (!apiKey) return fallback;

  try {
    const url = new URL(USDA_ENDPOINT);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("pageSize", "1");

    const response = await fetch(url.toString());
    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      foods?: Array<{
        description?: string;
        foodNutrients?: Array<{
          nutrientName?: string;
          nutrientNumber?: string;
          unitName?: string;
          value?: number;
        }>;
      }>;
    };

    const first = data.foods?.[0];
    if (!first) return fallback;

    const energy = first.foodNutrients?.find(
      (nutrient) =>
        nutrient.nutrientNumber === "208" ||
        nutrient.nutrientName?.toLowerCase().includes("energy")
    );

    if (!energy?.value) return fallback;

    return {
      name: first.description ?? fallback.name,
      per100g: energy.value,
      servingGrams: fallback.servingGrams,
      servingLabel: fallback.servingLabel,
      source: "USDA"
    };
  } catch {
    return fallback;
  }
}
