import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pages, keyword } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      // Fallback: basic keyword extraction without AI
      return NextResponse.json({
        analysis: generateBasicAnalysis(pages, keyword),
        aiPowered: false,
      });
    }

    // Build the prompt
    const pagesSummary = pages
      .map(
        (p: any, i: number) =>
          `--- Page ${i + 1}: ${p.url} ---\nTitle: ${p.title}\nH1: ${p.h1Tags?.join(", ") || "None"}\nHeadings: ${p.headings?.map((h: any) => `${h.tag}: ${h.text}`).join("; ") || "None"}\nWord Count: ${p.wordCount}\nContent (excerpt): ${p.bodyExcerpt?.slice(0, 2000) || "N/A"}\n`
      )
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are an SEO content analyst. Analyze these top 3 Google results for the search term "${keyword}".

${pagesSummary}

Respond with ONLY a JSON object (no markdown, no backticks) with this structure:
{
  "topicClusters": [
    { "name": "cluster name", "topics": ["topic1", "topic2"], "coveredBy": [1, 2, 3] }
  ],
  "commonThemes": ["theme1", "theme2", "theme3"],
  "contentGaps": ["gap1", "gap2"],
  "recommendedTopics": ["topic1", "topic2", "topic3"],
  "avgContentDepth": "shallow | moderate | deep",
  "summary": "2-3 sentence analysis of what these top results have in common and how to compete."
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      return NextResponse.json({
        analysis: generateBasicAnalysis(pages, keyword),
        aiPowered: false,
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(cleaned);
      return NextResponse.json({ analysis, aiPowered: true });
    } catch {
      return NextResponse.json({
        analysis: generateBasicAnalysis(pages, keyword),
        aiPowered: false,
      });
    }
  } catch (error: any) {
    console.error("Clusters error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateBasicAnalysis(pages: any[], keyword: string) {
  // Extract all headings across pages
  const allHeadings = pages.flatMap((p: any) =>
    (p.headings || []).map((h: any) => h.text.toLowerCase())
  );

  // Find common words across headings (basic topic extraction)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "this", "that", "these", "those",
    "i", "you", "he", "she", "it", "we", "they", "what", "which", "who",
    "how", "when", "where", "why", "not", "no", "your", "our", "their",
    "from", "about", "into", "more", "most", "than", "very", "just",
  ]);

  const wordFreq: Record<string, number> = {};
  allHeadings.forEach((h) => {
    h.split(/\s+/).forEach((word: string) => {
      const clean = word.replace(/[^a-z0-9]/g, "");
      if (clean.length > 2 && !stopWords.has(clean)) {
        wordFreq[clean] = (wordFreq[clean] || 0) + 1;
      }
    });
  });

  const commonThemes = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    topicClusters: [],
    commonThemes,
    contentGaps: [],
    recommendedTopics: [],
    avgContentDepth: pages.reduce((sum: number, p: any) => sum + (p.wordCount || 0), 0) / pages.length > 1500 ? "deep" : "moderate",
    summary: `Basic analysis of ${pages.length} pages for "${keyword}". Add an ANTHROPIC_API_KEY for AI-powered topic cluster analysis.`,
  };
}
