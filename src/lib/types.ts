export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface HeadingInfo {
  tag: string;
  text: string;
}

export interface SchemaInfo {
  type: string;
  data: any;
}

export interface PageAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  h1Tags: string[];
  headings: HeadingInfo[];
  wordCount: number;
  keyword: string | null;
  keywordCount: number;
  keywordDensity: number;
  keywordLocations: string[];
  schemas: SchemaInfo[];
  schemaTypes: string[];
  ogTitle: string;
  ogImage: string;
  canonical: string;
  internalLinks: number;
  externalLinks: number;
  totalImages: number;
  imagesWithoutAlt: number;
  bodyExcerpt: string;
  error?: string;
}

export interface TopicCluster {
  name: string;
  topics: string[];
  coveredBy: number[];
}

export interface ClusterAnalysis {
  topicClusters: TopicCluster[];
  commonThemes: string[];
  contentGaps: string[];
  recommendedTopics: string[];
  avgContentDepth: string;
  summary: string;
}
