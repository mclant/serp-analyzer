import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  try {
    const { url, keyword } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    // Fetch the page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let html: string;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch page: ${response.status}`, url },
          { status: 502 }
        );
      }

      html = await response.text();
    } catch (fetchError: any) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: `Could not reach page: ${fetchError.message}`, url },
        { status: 502 }
      );
    }

    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    // --- Title ---
    const title = $("title").first().text().trim();

    // --- Meta Description ---
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      "";

    // --- H1 Tags ---
    const h1Tags: string[] = [];
    $("h1").each((_, el) => {
      const text = $(el).text().trim();
      if (text) h1Tags.push(text);
    });

    // --- All Headings (for structure analysis) ---
    const headings: { tag: string; text: string }[] = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const tag = (el as any).tagName?.toLowerCase() || "h2";
      const text = $(el).text().trim();
      if (text) headings.push({ tag, text });
    });

    // --- Body Text ---
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

    // --- Keyword Analysis ---
    let keywordCount = 0;
    let keywordDensity = 0;
    const keywordLocations: string[] = [];

    if (keyword) {
      const kw = keyword.toLowerCase();
      const bodyLower = bodyText.toLowerCase();

      // Count occurrences
      let pos = 0;
      while (true) {
        const idx = bodyLower.indexOf(kw, pos);
        if (idx === -1) break;
        keywordCount++;
        pos = idx + 1;
      }

      keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

      // Check keyword locations
      if (title.toLowerCase().includes(kw)) keywordLocations.push("title");
      if (metaDescription.toLowerCase().includes(kw)) keywordLocations.push("meta description");
      if (h1Tags.some((h) => h.toLowerCase().includes(kw))) keywordLocations.push("h1");
      if (
        headings
          .filter((h) => h.tag === "h2")
          .some((h) => h.text.toLowerCase().includes(kw))
      )
        keywordLocations.push("h2");
      if ($('img[alt]').toArray().some((el) => $(el).attr('alt')?.toLowerCase().includes(kw)))
        keywordLocations.push("image alt text");
      if (url.toLowerCase().includes(kw)) keywordLocations.push("URL");
    }

    // --- Schema / Structured Data ---
    const schemas: { type: string; data: any }[] = [];
    const schemaTypes: string[] = [];

    // JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          items.forEach((item) => {
            const type = item["@type"] || "Unknown";
            const types = Array.isArray(type) ? type : [type];
            types.forEach((t: string) => {
              if (!schemaTypes.includes(t)) schemaTypes.push(t);
            });
            schemas.push({ type: types.join(", "), data: item });
          });
        }
      } catch {}
    });

    // Microdata
    $("[itemtype]").each((_, el) => {
      const itemtype = $(el).attr("itemtype") || "";
      const type = itemtype.split("/").pop() || itemtype;
      if (type && !schemaTypes.includes(type)) {
        schemaTypes.push(type);
        schemas.push({ type, data: { source: "microdata", itemtype } });
      }
    });

    // --- Additional Meta ---
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
    const ogImage = $('meta[property="og:image"]').attr("content")?.trim() || "";
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";

    // --- Internal / External Links ---
    const domain = new URL(url).hostname;
    let internalLinks = 0;
    let externalLinks = 0;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === domain) internalLinks++;
        else externalLinks++;
      } catch {}
    });

    // --- Images without alt text ---
    const totalImages = $("img").length;
    const imagesWithoutAlt = $("img").filter((_, el) => {
      const alt = $(el).attr("alt");
      return !alt || alt.trim() === "";
    }).length;

    return NextResponse.json({
      url,
      title,
      metaDescription,
      h1Tags,
      headings: headings.slice(0, 50),
      wordCount,
      keyword: keyword || null,
      keywordCount,
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      keywordLocations,
      schemas,
      schemaTypes,
      ogTitle,
      ogImage,
      canonical,
      internalLinks,
      externalLinks,
      totalImages,
      imagesWithoutAlt,
      // Send first ~3000 words of body text for topic cluster analysis
      bodyExcerpt: bodyText.split(/\s+/).slice(0, 3000).join(" "),
    });
  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
