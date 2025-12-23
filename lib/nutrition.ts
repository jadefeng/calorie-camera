import type { NutritionLookup } from "./types";

const FALLBACK_FOODS: NutritionLookup[] = [
  { name: "apple", per100g: 52, servingGrams: 182, servingLabel: "1 medium", source: "fallback" },
  { name: "banana", per100g: 89, servingGrams: 118, servingLabel: "1 medium", source: "fallback" },
  { name: "orange", per100g: 47, servingGrams: 140, servingLabel: "1 medium", source: "fallback" },
  { name: "salad", per100g: 35, servingGrams: 150, servingLabel: "1 bowl", source: "fallback" },
  { name: "pizza", per100g: 266, servingGrams: 107, servingLabel: "1 slice", source: "fallback" },
  { name: "burger", per100g: 295, servingGrams: 200, servingLabel: "1 burger", source: "fallback" },
  { name: "fries", per100g: 312, servingGrams: 117, servingLabel: "1 medium", source: "fallback" },
  { name: "rice", per100g: 130, servingGrams: 158, servingLabel: "1 cup", source: "fallback" },
  { name: "pasta", per100g: 157, servingGrams: 140, servingLabel: "1 cup", source: "fallback" },
  { name: "chicken breast", per100g: 165, servingGrams: 120, servingLabel: "1 piece", source: "fallback" },
  { name: "steak", per100g: 271, servingGrams: 170, servingLabel: "1 piece", source: "fallback" },
  { name: "egg", per100g: 155, servingGrams: 50, servingLabel: "1 large", source: "fallback" },
  { name: "sushi", per100g: 143, servingGrams: 45, servingLabel: "1 piece", source: "fallback" },
  { name: "avocado", per100g: 160, servingGrams: 150, servingLabel: "1 medium", source: "fallback" },
  { name: "bread", per100g: 265, servingGrams: 38, servingLabel: "1 slice", source: "fallback" },
  { name: "yogurt", per100g: 59, servingGrams: 150, servingLabel: "1 cup", source: "fallback" },
  { name: "soup", per100g: 55, servingGrams: 240, servingLabel: "1 bowl", source: "fallback" },
  { name: "taco", per100g: 226, servingGrams: 120, servingLabel: "1 taco", source: "fallback" }
];

const DEFAULT_NUTRITION: NutritionLookup = {
  name: "mixed food",
  per100g: 200,
  servingGrams: 150,
  servingLabel: "1 serving",
  source: "fallback"
};

export function normalizeFoodName(name: string) {
  return name.trim().toLowerCase();
}

export function findFallbackFood(name: string): NutritionLookup {
  const normalized = normalizeFoodName(name);
  const match = FALLBACK_FOODS.find((food) => normalized.includes(food.name));
  return match ?? { ...DEFAULT_NUTRITION, name: name.trim() || DEFAULT_NUTRITION.name };
}

export function getFallbackList(query: string) {
  const normalized = normalizeFoodName(query);
  return FALLBACK_FOODS.filter((food) => food.name.includes(normalized)).slice(0, 5);
}

export const fallbackFoods = FALLBACK_FOODS;
