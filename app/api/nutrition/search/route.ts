import { NextResponse } from "next/server";
import { z } from "zod";
import { getFallbackList, findFallbackFood } from "@/lib/nutrition";
import { lookupNutrition } from "@/lib/usda";

const SearchSchema = z.object({
  query: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SearchSchema.parse(body);
    const usdaKey = process.env.USDA_API_KEY;

    const usdaResult = await lookupNutrition(parsed.query, usdaKey);
    const fallbackMatches = getFallbackList(parsed.query);

    const results = [usdaResult, ...fallbackMatches]
      .filter((item, index, array) =>
        array.findIndex((existing) => existing.name === item.name) === index
      )
      .slice(0, 5);

    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ results: [findFallbackFood("food")] });
  }
}
