# Calorie Camera

Mobile-first PWA that estimates calories from a food photo with editable results and uncertainty ranges.

## Features
- Camera capture + upload fallback
- Two-stage analysis: vision detection + portion/nutrition estimate
- Editable foods and portion controls
- Local history stored in `localStorage`
- Friendly confidence banner + disclaimer

## Tech
- Next.js App Router + TypeScript
- Tailwind CSS
- OpenAI Vision (optional) + USDA FoodData Central (optional)

## Setup
```bash
npm install
npm run dev
```

Create a `.env.local` file:
```
OPENAI_API_KEY=your_openai_key
USDA_API_KEY=your_usda_key
```

If API keys are missing, the app falls back to manual entry and a local nutrition table.

## Scripts
- `npm run dev` - local dev server
- `npm run build` - production build
- `npm run start` - run production build
- `npm run test` - unit tests for portion/calorie logic

## Deploy
Vercel is recommended. Set `OPENAI_API_KEY` and `USDA_API_KEY` in the project environment variables.

## Disclaimer
Estimates only, not medical advice.
