import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query, gl } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey || apiKey === "your_serper_api_key_here") {
      return NextResponse.json(
        { error: "SERPER_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const serperPayload = {
      q: query,
      num: 3,
      gl: gl || "us",
    };
    console.log("Serper request payload:", JSON.stringify(serperPayload));

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serperPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Serper error:", text);
      return NextResponse.json(
        { error: `Serper API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    const results = (data.organic || []).slice(0, 3).map((item: any) => ({
      title: item.title || "",
      url: item.link || "",
      snippet: item.snippet || "",
      position: item.position || 0,
    }));

    return NextResponse.json({ results, searchQuery: query });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
