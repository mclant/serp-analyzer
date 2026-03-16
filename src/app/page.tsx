"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Globe,
  FileText,
  Hash,
  Tag,
  Code2,
  BarChart3,
  ExternalLink,
  Image,
  Link2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Layers,
} from "lucide-react";
import type { SearchResult, PageAnalysis, ClusterAnalysis } from "@/lib/types";

type AnalysisState = {
  searchResults: SearchResult[];
  pages: (PageAnalysis | null)[];
  clusters: ClusterAnalysis | null;
  aiPowered: boolean;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [data, setData] = useState<AnalysisState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Step 1: Get search results
      setLoadingStage("Searching Google for top results…");
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!searchRes.ok) {
        const err = await searchRes.json();
        throw new Error(err.error || "Search failed");
      }

      const { results } = await searchRes.json();

      if (!results?.length) {
        throw new Error("No results found for that search term.");
      }

      // Step 2: Analyze each page in parallel
      setLoadingStage(`Analyzing ${results.length} pages…`);
      const pageAnalyses = await Promise.all(
        results.map(async (result: SearchResult) => {
          try {
            const res = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: result.url, keyword: query.trim() }),
            });
            if (!res.ok) {
              const err = await res.json();
              return { url: result.url, error: err.error } as any;
            }
            return await res.json();
          } catch (e: any) {
            return { url: result.url, error: e.message } as any;
          }
        })
      );

      // Step 3: Topic cluster analysis
      setLoadingStage("Identifying topic clusters & patterns…");
      const validPages = pageAnalyses.filter((p: any) => !p.error);
      let clusters: ClusterAnalysis | null = null;
      let aiPowered = false;

      if (validPages.length > 0) {
        try {
          const clusterRes = await fetch("/api/clusters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages: validPages, keyword: query.trim() }),
          });
          if (clusterRes.ok) {
            const clusterData = await clusterRes.json();
            clusters = clusterData.analysis;
            aiPowered = clusterData.aiPowered;
          }
        } catch {}
      }

      setData({
        searchResults: results,
        pages: pageAnalyses,
        clusters,
        aiPowered,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  }, [query]);

  const toggleSchema = (key: string) => {
    setExpandedSchemas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SERP Analyzer</h1>
              <p className="text-xs text-muted-foreground">
                Analyze the top Google results for any search term
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter a search term (e.g. best climbing shoes 2025)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
              className="h-11 text-sm"
              disabled={loading}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="h-11 px-6 shrink-0"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Analyzing</span>
                </div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {loading && loadingStage && (
            <p className="text-xs text-muted-foreground mt-2 animate-pulse-subtle">
              {loadingStage}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Something went wrong</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Topic Clusters Section */}
            {data.clusters && (
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Topic Analysis</CardTitle>
                    {data.aiPowered && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Sparkles className="h-3 w-3" /> AI-Powered
                      </Badge>
                    )}
                  </div>
                  {data.clusters.summary && (
                    <CardDescription className="mt-2 leading-relaxed">
                      {data.clusters.summary}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Common Themes */}
                    {data.clusters.commonThemes?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                          Common Themes
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {data.clusters.commonThemes.map((theme, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Topics */}
                    {data.clusters.recommendedTopics?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                          Recommended Topics
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {data.clusters.recommendedTopics.map((topic, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Gaps */}
                    {data.clusters.contentGaps?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          Content Gaps
                        </h4>
                        <ul className="space-y-1">
                          {data.clusters.contentGaps.map((gap, i) => (
                            <li key={i} className="text-sm text-muted-foreground">
                              • {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Topic Clusters */}
                    {data.clusters.topicClusters?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          Topic Clusters
                        </h4>
                        <div className="space-y-2">
                          {data.clusters.topicClusters.map((cluster, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{cluster.name}</span>
                              <span className="text-muted-foreground ml-1.5">
                                — {cluster.topics.join(", ")}
                              </span>
                              {cluster.coveredBy?.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (pages {cluster.coveredBy.join(", ")})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {data.clusters.avgContentDepth && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-xs text-muted-foreground">
                        Average content depth:{" "}
                        <span className="font-medium text-foreground capitalize">
                          {data.clusters.avgContentDepth}
                        </span>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Individual Page Results */}
            {data.pages.map((page, idx) => {
              if (!page) return null;

              const searchResult = data.searchResults[idx];

              if (page.error) {
                return (
                  <Card key={idx} className="border-destructive/20 opacity-75">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          #{idx + 1}
                        </Badge>
                        <CardTitle className="text-base truncate">
                          {searchResult?.title || page.url}
                        </CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Could not analyze: {page.error}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        #{idx + 1}
                      </Badge>
                      <CardTitle className="text-base truncate">{page.title}</CardTitle>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                  </CardHeader>

                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="w-full justify-start">
                        <TabsTrigger value="overview" className="text-xs">
                          Overview
                        </TabsTrigger>
                        <TabsTrigger value="keyword" className="text-xs">
                          Keyword
                        </TabsTrigger>
                        <TabsTrigger value="headings" className="text-xs">
                          Headings
                        </TabsTrigger>
                        <TabsTrigger value="schema" className="text-xs">
                          Schema
                        </TabsTrigger>
                        <TabsTrigger value="technical" className="text-xs">
                          Technical
                        </TabsTrigger>
                      </TabsList>

                      {/* Overview Tab */}
                      <TabsContent value="overview" className="mt-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <StatCard
                            icon={<FileText className="h-4 w-4" />}
                            label="Word Count"
                            value={page.wordCount.toLocaleString()}
                          />
                          <StatCard
                            icon={<Hash className="h-4 w-4" />}
                            label="Keyword Count"
                            value={page.keywordCount.toString()}
                            sub={`${page.keywordDensity}% density`}
                          />
                          <StatCard
                            icon={<Code2 className="h-4 w-4" />}
                            label="Schema Types"
                            value={page.schemaTypes.length.toString()}
                          />
                        </div>

                        <div className="mt-4 space-y-3">
                          <MetaRow label="Title" value={page.title} />
                          <MetaRow label="Meta Description" value={page.metaDescription} />
                          <MetaRow
                            label="H1"
                            value={page.h1Tags.length > 0 ? page.h1Tags.join(" | ") : "None"}
                          />
                        </div>
                      </TabsContent>

                      {/* Keyword Tab */}
                      <TabsContent value="keyword" className="mt-4">
                        <div className="grid gap-4 sm:grid-cols-3 mb-4">
                          <StatCard
                            icon={<Hash className="h-4 w-4" />}
                            label="Occurrences"
                            value={page.keywordCount.toString()}
                          />
                          <StatCard
                            icon={<BarChart3 className="h-4 w-4" />}
                            label="Density"
                            value={`${page.keywordDensity}%`}
                          />
                          <StatCard
                            icon={<Tag className="h-4 w-4" />}
                            label="Placements"
                            value={page.keywordLocations.length.toString()}
                          />
                        </div>

                        {page.keywordLocations.length > 0 ? (
                          <div>
                            <p className="text-sm font-medium mb-2">
                              Keyword found in:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {page.keywordLocations.map((loc, i) => (
                                <Badge key={i} variant="secondary" className="text-xs capitalize">
                                  {loc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Keyword not found in any key locations (title, meta, H1, H2, alt text, URL).
                          </p>
                        )}
                      </TabsContent>

                      {/* Headings Tab */}
                      <TabsContent value="headings" className="mt-4">
                        {page.headings.length > 0 ? (
                          <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
                            {page.headings.map((h, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0 uppercase font-mono mt-0.5"
                                >
                                  {h.tag}
                                </Badge>
                                <span
                                  className={
                                    h.tag === "h1"
                                      ? "font-semibold"
                                      : h.tag === "h2"
                                      ? "font-medium"
                                      : "text-muted-foreground"
                                  }
                                  style={{
                                    paddingLeft: `${(parseInt(h.tag.replace("h", "")) - 1) * 12}px`,
                                  }}
                                >
                                  {h.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No headings found on this page.
                          </p>
                        )}
                      </TabsContent>

                      {/* Schema Tab */}
                      <TabsContent value="schema" className="mt-4">
                        {page.schemas.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {page.schemaTypes.map((type, i) => (
                                <Badge key={i} className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                            {page.schemas.map((schema, i) => {
                              const key = `${idx}-${i}`;
                              const isExpanded = expandedSchemas[key];
                              return (
                                <div key={i} className="border rounded-md">
                                  <button
                                    onClick={() => toggleSchema(key)}
                                    className="w-full flex items-center gap-2 p-3 text-sm text-left hover:bg-muted/50 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span className="font-medium">{schema.type}</span>
                                  </button>
                                  {isExpanded && (
                                    <pre className="p-3 pt-0 text-xs overflow-x-auto text-muted-foreground font-mono max-h-48 overflow-y-auto">
                                      {JSON.stringify(schema.data, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No structured data (JSON-LD or Microdata) found.
                          </p>
                        )}
                      </TabsContent>

                      {/* Technical Tab */}
                      <TabsContent value="technical" className="mt-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <StatCard
                            icon={<Link2 className="h-4 w-4" />}
                            label="Internal Links"
                            value={page.internalLinks.toString()}
                          />
                          <StatCard
                            icon={<Globe className="h-4 w-4" />}
                            label="External Links"
                            value={page.externalLinks.toString()}
                          />
                          <StatCard
                            icon={<Image className="h-4 w-4" />}
                            label="Images"
                            value={page.totalImages.toString()}
                            sub={
                              page.imagesWithoutAlt > 0
                                ? `${page.imagesWithoutAlt} missing alt text`
                                : "All have alt text"
                            }
                            subWarning={page.imagesWithoutAlt > 0}
                          />
                        </div>

                        <div className="mt-4 space-y-3">
                          <MetaRow label="OG Title" value={page.ogTitle || "Not set"} />
                          <MetaRow label="Canonical" value={page.canonical || "Not set"} />
                          {page.ogImage && (
                            <MetaRow label="OG Image" value={page.ogImage} isLink />
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!data && !loading && !error && (
          <div className="text-center py-24">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium">Enter a search term to get started</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              We&apos;ll find the top 3 Google results, then analyze each page&apos;s content,
              keywords, headings, schema, and topic patterns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({
  icon,
  label,
  value,
  sub,
  subWarning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subWarning?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {sub && (
        <p
          className={`text-xs mt-0.5 ${
            subWarning ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <span className="text-xs font-medium text-muted-foreground shrink-0 sm:w-32 sm:text-right pt-0.5">
        {label}
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm break-words">
          {value || <span className="text-muted-foreground italic">Not set</span>}
        </span>
      )}
    </div>
  );
}
