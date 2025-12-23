import type { NutritionLookup } from "./types";
import { findFallbackFood } from "./nutrition";

const DEFAULT_RANGE = 0.35;

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PortionEstimate = {
  grams: number;
  method: "default_serving";
  rangeGrams: [number, number];
  servingGrams: number;
  servingLabel: string;
};

export function applyPortionFactor(grams: number, factor?: number) {
  if (!factor) return grams;
  return Math.max(10, grams * factor);
}

export function estimatePortion(
  foodName: string,
  _foodBox?: BBox
): PortionEstimate {
  const nutrition = findFallbackFood(foodName);
  return {
    grams: nutrition.servingGrams,
    method: "default_serving",
    rangeGrams: buildRange(nutrition.servingGrams, DEFAULT_RANGE),
    servingGrams: nutrition.servingGrams,
    servingLabel: nutrition.servingLabel
  };
}

export function estimateCalories(grams: number, nutrition: NutritionLookup) {
  const value = (grams * nutrition.per100g) / 100;
  return {
    value,
    range: buildRange(value, 0.25),
    per100g: nutrition.per100g,
    source: nutrition.source
  };
}

export function buildRange(value: number, variance: number): [number, number] {
  const low = Math.max(0, value * (1 - variance));
  const high = value * (1 + variance);
  return [round(low), round(high)];
}

export function round(value: number, digits = 0) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
