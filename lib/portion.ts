import type { NutritionLookup } from "./types";
import { findFallbackFood } from "./nutrition";

const DEFAULT_SERVING_AREA_CM2 = 80;
const DEFAULT_RANGE = 0.3;
const REFERENCE_OBJECTS = {
  credit_card: { areaCm2: 8.56 * 5.4 },
  fork: { areaCm2: 19 * 2.5 }
};

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PortionEstimate = {
  grams: number;
  method: "reference_object" | "default_serving";
  rangeGrams: [number, number];
  servingGrams: number;
  servingLabel: string;
};

export function estimatePortion(
  foodName: string,
  referenceObject: keyof typeof REFERENCE_OBJECTS | "none",
  foodBox?: BBox,
  referenceBox?: BBox
): PortionEstimate {
  const nutrition = findFallbackFood(foodName);
  if (referenceObject !== "none" && foodBox && referenceBox) {
    const referenceAreaPx = referenceBox.width * referenceBox.height;
    const foodAreaPx = foodBox.width * foodBox.height;
    if (referenceAreaPx > 0 && foodAreaPx > 0) {
      const cm2PerPx = REFERENCE_OBJECTS[referenceObject].areaCm2 / referenceAreaPx;
      const foodAreaCm2 = foodAreaPx * cm2PerPx;
      const grams = Math.max(15, (nutrition.servingGrams / DEFAULT_SERVING_AREA_CM2) * foodAreaCm2);
      return {
        grams,
        method: "reference_object",
        rangeGrams: buildRange(grams, 0.2),
        servingGrams: nutrition.servingGrams,
        servingLabel: nutrition.servingLabel
      };
    }
  }

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
