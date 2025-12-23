import { describe, expect, it } from "vitest";
import { estimatePortion, estimateCalories } from "@/lib/portion";
import { findFallbackFood } from "@/lib/nutrition";

describe("portion estimation", () => {
  it("uses default serving by default", () => {
    const portion = estimatePortion("apple", "none");
    expect(portion.method).toBe("default_serving");
    expect(portion.grams).toBeGreaterThan(50);
  });

  it("uses default serving even with bounding boxes", () => {
    const portion = estimatePortion("pizza", { x: 0, y: 0, width: 200, height: 200 });
    expect(portion.method).toBe("default_serving");
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
