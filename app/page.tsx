"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/types";
import { AnalyzeResponseSchema } from "@/lib/types";
import { addHistoryEntry, loadHistory, saveHistory } from "@/lib/history";
import { buildRange, round } from "@/lib/portion";
import { compressImage, createThumbnail } from "@/lib/image";

const progressSteps = [
  "Uploading",
  "Detecting foods",
  "Estimating portions",
  "Fetching nutrition"
];

type Step = "idle" | "preview" | "analyzing" | "results" | "manual" | "error";

type EditableItem = AnalyzeResponse["items"][number] & {
  unit: "g" | "serving";
};

type NutritionResult = {
  name: string;
  per100g: number;
  servingGrams: number;
  servingLabel: string;
  source: "USDA" | "fallback";
};

export default function Home() {
  const [step, setStep] = useState<Step>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [history, setHistory] = useState(loadHistory());
  const [referenceObject, setReferenceObject] = useState<"none" | "credit_card" | "fork">("none");
  const [progressIndex, setProgressIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (step !== "analyzing") return;
    setProgressIndex(0);
    const interval = window.setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % progressSteps.length);
    }, 1200);
    return () => window.clearInterval(interval);
  }, [step]);

  const confidenceLow = useMemo(
    () => items.some((item) => item.confidence < 0.6),
    [items]
  );

  const totalCalories = useMemo(() => {
    const value = items.reduce((sum, item) => sum + item.calories.value, 0);
    const low = items.reduce((sum, item) => sum + item.calories.range[0], 0);
    const high = items.reduce((sum, item) => sum + item.calories.range[1], 0);
    return { value: round(value), range: [round(low), round(high)] as [number, number] };
  }, [items]);

  async function handleFileSelection(file: File) {
    setErrorMessage(null);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setStep("preview");

    try {
      const [compressed, thumb] = await Promise.all([
        compressImage(file),
        createThumbnail(file)
      ]);
      setCompressedImage(compressed);
      setThumbnail(thumb);
    } catch (error) {
      console.error(error);
      setErrorMessage("Image processing failed. Try another photo.");
      setStep("error");
    }
  }

  async function analyzePhoto() {
    if (!compressedImage) return;
    setStep("analyzing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: compressedImage,
          referenceObject
        })
      });

      const data = await response.json();
      const parsed = AnalyzeResponseSchema.parse(data);

      if (parsed.items.length === 0) {
        setStep("manual");
        return;
      }

      const nextItems = parsed.items.map((item) => ({
        ...item,
        unit: "g" as const
      }));
      setItems(nextItems);
      setStep("results");
    } catch (error) {
      console.error(error);
      setErrorMessage("We could not analyze the image. Please enter foods manually.");
      setStep("manual");
    }
  }

  async function lookupNutrition(name: string): Promise<NutritionResult> {
    const response = await fetch("/api/nutrition/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: name })
    });
    const data = (await response.json()) as { results: NutritionResult[] };
    return data.results?.[0] ?? {
      name,
      per100g: 200,
      servingGrams: 150,
      servingLabel: "1 serving",
      source: "fallback"
    };
  }

  async function updateItem(index: number, name: string, grams: number) {
    const nutrition = await lookupNutrition(name);
    const caloriesValue = (grams * nutrition.per100g) / 100;
    const caloriesRange = buildRange(caloriesValue, 0.2);

    setItems((prev) => {
      const next = [...prev];
      const existing = next[index];
      next[index] = {
        ...existing,
        name,
        portion: {
          grams: round(grams),
          method: "user_edit",
          range_grams: buildRange(grams, 0.15)
        },
        calories: {
          value: round(caloriesValue),
          range: [round(caloriesRange[0]), round(caloriesRange[1])],
          per100g: nutrition.per100g,
          source: nutrition.source
        },
        servingGrams: nutrition.servingGrams,
        servingLabel: nutrition.servingLabel
      };
      return next;
    });
  }

  function adjustPortion(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const grams = Math.max(10, item.portion.grams + delta);
      const caloriesValue = (grams * item.calories.per100g) / 100;
      const caloriesRange = buildRange(caloriesValue, 0.2);

      next[index] = {
        ...item,
        portion: {
          ...item.portion,
          grams: round(grams),
          method: "user_edit",
          range_grams: buildRange(grams, 0.15)
        },
        calories: {
          ...item.calories,
          value: round(caloriesValue),
          range: [round(caloriesRange[0]), round(caloriesRange[1])]
        }
      };

      return next;
    });
  }

  function toggleUnit(index: number) {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      next[index] = {
        ...item,
        unit: item.unit === "g" ? "serving" : "g"
      };
      return next;
    });
  }

  function saveToHistory() {
    if (!thumbnail || items.length === 0) return;
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      thumbnailDataUrl: thumbnail,
      items,
      totalCalories
    };

    const next = addHistoryEntry(entry);
    setHistory(next);
  }

  function startOver() {
    setStep("idle");
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressedImage(null);
    setItems([]);
    setReferenceObject("none");
    setErrorMessage(null);
    setThumbnail(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  function handleHistoryClear() {
    saveHistory([]);
    setHistory([]);
  }

  return (
    <main className="min-h-screen bg-sand">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <section className="flex-1 space-y-6">
          <header className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-moss">Calorie Camera</p>
            <h1 className="text-3xl font-semibold text-ink sm:text-4xl">
              Snap a food photo. Get a calorie estimate with confidence.
            </h1>
            <p className="text-base text-ink/70">
              Estimates only, not medical advice. Tap items to correct portions and nutrition.
            </p>
          </header>

          <div className="space-y-4 rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-sand"
                onClick={() => cameraInputRef.current?.click()}
              >
                Take Photo
              </button>
              <button
                className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink"
                onClick={() => uploadInputRef.current?.click()}
              >
                Upload Photo
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFileSelection(file);
              }}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFileSelection(file);
              }}
            />

            {previewUrl && (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Selected food"
                  className="h-60 w-full rounded-2xl object-cover"
                />

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink">Reference object</p>
                  <div className="flex flex-wrap gap-2">
                    {["none", "credit_card", "fork"].map((value) => (
                      <button
                        key={value}
                        onClick={() => setReferenceObject(value as typeof referenceObject)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          referenceObject === value
                            ? "bg-moss text-sand"
                            : "bg-sand text-ink shadow-inset"
                        }`}
                      >
                        {value === "none" ? "No reference" : value.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="w-full rounded-2xl bg-ink py-3 text-sm font-semibold text-sand"
                  onClick={analyzePhoto}
                >
                  Analyze
                </button>
              </div>
            )}

            {step === "analyzing" && (
              <div className="space-y-3 rounded-2xl bg-sand p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-moss" />
                  {progressSteps[progressIndex]}
                </div>
                <p className="text-xs text-ink/60">
                  This can take a few seconds on mobile networks.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>

          {(step === "results" || step === "manual") && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-moss">Results</p>
                  <h2 className="text-2xl font-semibold text-ink">Estimated calories</h2>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/60">Total</p>
                  <p className="text-xl font-semibold text-ink">
                    {totalCalories.value} kcal
                  </p>
                  <p className="text-xs text-ink/60">
                    {totalCalories.range[0]}–{totalCalories.range[1]} kcal range
                  </p>
                </div>
              </div>

              {confidenceLow && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  This is an estimate. Tap to correct items.
                </div>
              )}

              {step === "manual" && (
                <ManualEntry
                  onAdd={async (name, grams) => {
                    const nutrition = await lookupNutrition(name);
                    const caloriesValue = (grams * nutrition.per100g) / 100;
                    setItems((prev) => [
                      ...prev,
                      {
                        name,
                        confidence: 0.4,
                        portion: {
                          grams: round(grams),
                          method: "user_edit",
                          range_grams: buildRange(grams, 0.15)
                        },
                        calories: {
                          value: round(caloriesValue),
                          range: buildRange(caloriesValue, 0.2),
                          per100g: nutrition.per100g,
                          source: nutrition.source
                        },
                        servingGrams: nutrition.servingGrams,
                        servingLabel: nutrition.servingLabel,
                        unit: "g"
                      }
                    ]);
                    setStep("results");
                  }}
                />
              )}

              <div className="space-y-4">
                {items.map((item, index) => (
                  <ItemCard
                    key={`${item.name}-${index}`}
                    item={item}
                    onAdjust={(delta) => adjustPortion(index, delta)}
                    onToggleUnit={() => toggleUnit(index)}
                    onSave={(name, grams) => updateItem(index, name, grams)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-sand"
                  onClick={saveToHistory}
                >
                  Save to History
                </button>
                <button
                  className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink"
                  onClick={startOver}
                >
                  Start Over
                </button>
              </div>
            </section>
          )}
        </section>

        <aside className="w-full max-w-md space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">History</h3>
              <button
                className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40"
                onClick={handleHistoryClear}
              >
                Clear
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {history.length === 0 && (
                <p className="text-sm text-ink/60">No saved scans yet.</p>
              )}
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-2xl bg-sand p-3"
                >
                  <img
                    src={entry.thumbnailDataUrl}
                    alt="History thumbnail"
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {entry.totalCalories.value} kcal
                    </p>
                    <p className="text-xs text-ink/60">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-6 text-sm text-ink/70 shadow-soft">
            <p className="font-semibold text-ink">How it works</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>1. Photo is analyzed by a vision model to detect foods.</li>
              <li>2. Portions are estimated from defaults or a reference object.</li>
              <li>3. Calories are looked up and summed with uncertainty.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ItemCard({
  item,
  onAdjust,
  onToggleUnit,
  onSave
}: {
  item: EditableItem;
  onAdjust: (delta: number) => void;
  onToggleUnit: () => void;
  onSave: (name: string, grams: number) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftGrams, setDraftGrams] = useState(item.portion.grams);

  useEffect(() => {
    setDraftName(item.name);
    setDraftGrams(item.portion.grams);
  }, [item.name, item.portion.grams]);

  const displayPortion =
    item.unit === "serving" && item.servingGrams
      ? `${(item.portion.grams / item.servingGrams).toFixed(1)} serving`
      : `${item.portion.grams} g`;
  const deltaStep = item.unit === "serving" ? (item.servingGrams ?? 50) * 0.25 : 10;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{item.name}</p>
          <p className="text-xs text-ink/60">
            Confidence {Math.round(item.confidence * 100)}%
          </p>
        </div>
        <button
          className="text-xs font-semibold uppercase tracking-[0.2em] text-moss"
          onClick={() => setEditing((prev) => !prev)}
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Portion</p>
          <button
            className="rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold text-ink"
            onClick={onToggleUnit}
          >
            {item.unit === "g" ? "g" : "serving"}
          </button>
        </div>
        <p className="text-sm text-ink/70">{displayPortion}</p>
        <div className="flex items-center gap-3">
          <button
            className="h-9 w-9 rounded-full bg-sand text-lg font-semibold text-ink"
            onClick={() => onAdjust(-deltaStep)}
          >
            -
          </button>
          <input
            type="range"
            min={20}
            max={600}
            value={item.portion.grams}
            onChange={(event) => onAdjust(Number(event.target.value) - item.portion.grams)}
            className="flex-1"
          />
          <button
            className="h-9 w-9 rounded-full bg-sand text-lg font-semibold text-ink"
            onClick={() => onAdjust(deltaStep)}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Calories</p>
          <p className="text-base font-semibold text-ink">{item.calories.value} kcal</p>
        </div>
        <p className="text-xs text-ink/60">
          {item.calories.range[0]}–{item.calories.range[1]} kcal
        </p>
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Food name
            </label>
            <input
              className="w-full rounded-2xl border border-ink/10 px-3 py-2 text-sm"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Portion (grams)
            </label>
            <input
              type="number"
              min={10}
              className="w-full rounded-2xl border border-ink/10 px-3 py-2 text-sm"
              value={draftGrams}
              onChange={(event) => setDraftGrams(Number(event.target.value))}
            />
          </div>
          <button
            className="w-full rounded-2xl bg-ink py-2 text-sm font-semibold text-sand"
            onClick={() => onSave(draftName, draftGrams)}
          >
            Save edits
          </button>
        </div>
      )}
    </div>
  );
}

function ManualEntry({ onAdd }: { onAdd: (name: string, grams: number) => void }) {
  const [name, setName] = useState("");
  const [grams, setGrams] = useState(150);

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-5">
      <p className="text-sm font-semibold text-ink">Manual entry</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <input
          className="w-full rounded-2xl border border-ink/10 px-3 py-2 text-sm"
          placeholder="Food name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          type="number"
          min={10}
          className="w-full rounded-2xl border border-ink/10 px-3 py-2 text-sm"
          value={grams}
          onChange={(event) => setGrams(Number(event.target.value))}
        />
      </div>
      <button
        className="mt-3 w-full rounded-2xl bg-moss py-2 text-sm font-semibold text-sand"
        onClick={() => {
          if (name.trim()) onAdd(name.trim(), grams);
          setName("");
        }}
      >
        Add item
      </button>
    </div>
  );
}
