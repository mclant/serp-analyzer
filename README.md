# SERP Analyzer

Analyze the top 3 Google results for any search term. Extracts word count, keyword usage, titles, meta descriptions, headings, schema markup, and topic patterns.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API keys

Copy the example env file and add your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- **SERPER_API_KEY** (required) — Get a free key at [serper.dev](https://serper.dev). Free tier includes 2,500 searches.
- **ANTHROPIC_API_KEY** (optional) — Enables AI-powered topic cluster analysis. Get a key at [console.anthropic.com](https://console.anthropic.com). Without this, topic analysis falls back to basic keyword extraction.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add your environment variables (`SERPER_API_KEY`, optionally `ANTHROPIC_API_KEY`)
4. Deploy

She bookmarks the URL. Done.

## What it analyzes

For each of the top 3 Google results:

- **Word count** of the page content
- **Keyword frequency** and density
- **Keyword placement** (title, meta description, H1, H2, URL, image alt text)
- **Title tag** and **meta description**
- **H1 tag** and full **heading structure** (H1-H6)
- **Schema markup** (JSON-LD and Microdata) with expandable raw data
- **Schema types** detected
- **Internal/external link counts**
- **Image count** and missing alt text
- **OG tags** and canonical URL

Cross-page analysis:

- **Topic clusters** and patterns across all 3 results
- **Common themes**
- **Content gaps** (topics competitors miss)
- **Recommended topics** to cover
- **Content depth** assessment

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Cheerio (HTML parsing)
- Serper.dev (Google search API)
- Anthropic Claude (optional, for topic analysis)
