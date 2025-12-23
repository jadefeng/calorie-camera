import { describe, expect, it } from "vitest";
import { estimatePortion, estimateCalories } from "@/lib/portion";
import { findFallbackFood } from "@/lib/nutrition";

describe("portion estimation", () => {
  it("uses default serving when no reference object", () => {
    const portion = estimatePortion("apple", "none");
    expect(portion.method).toBe("default_serving");
    expect(portion.grams).toBeGreaterThan(50);
  });

  it("scales with reference object and bounding boxes", () => {
    const portion = estimatePortion(
      "pizza",
      "credit_card",
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 0, y: 0, width: 100, height: 60 }
    );
    expect(portion.method).toBe("reference_object");
    expect(portion.grams).toBeGreaterThan(40);
  });
});

describe("calorie estimation", () => {
  it("computes calories from grams and per100g", () => {
    const nutrition = findFallbackFood("rice");
    const calories = estimateCalories(200, nutrition);
    expect(calories.value).toBeGreaterThan(200);
    expect(calories.per100g).toBe(nutrition.per100g);
  });
});
