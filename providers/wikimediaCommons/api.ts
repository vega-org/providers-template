import { ProviderContext } from "../types";

// Wikimedia Commons hosts only freely licensed media: public domain, CC0 and
// Creative Commons. Everything below uses its official MediaWiki API.
export const COMMONS = "https://commons.wikimedia.org";
export const API = `${COMMONS}/w/api.php`;

const SORT_ORDERS: Record<string, string> = {
  relevance: "relevance",
  newest: "create_timestamp_desc",
  linked: "incoming_links_desc",
};

export const getSortOrder = async (providerContext: ProviderContext): Promise<string> => {
  const choice = await providerContext.kvStore?.get<string>("sort");
  return SORT_ORDERS[choice || "relevance"] || SORT_ORDERS.relevance;
};

export const getPublicDomainOnly = async (providerContext: ProviderContext): Promise<boolean> =>
  (await providerContext.kvStore?.get<string>("licenses")) === "publicDomain";

export const apiHeaders = (providerContext: ProviderContext): Record<string, string> => ({
  ...providerContext.commonHeaders,
  // Wikimedia asks API clients to identify themselves.
  "Api-User-Agent": "VegaProviders/1.0 (https://github.com/Tanzeel0Hussain/vega-providers)",
});

export interface Derivative {
  src: string;
  type: string;
  title?: string;
  shorttitle?: string;
  width?: number;
  height?: number;
  bandwidth?: number;
}

export interface TimedText {
  src: string;
  type?: string;
  title?: string;
  shorttitle?: string;
  srclang?: string;
  kind?: string;
}

export interface CommonsPage {
  title: string;
  index?: number;
  imageinfo?: {
    url?: string;
    thumburl?: string;
    size?: number;
    mime?: string;
    mediatype?: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }[];
  videoinfo?: {
    derivatives?: Derivative[];
    timedtext?: TimedText[];
  }[];
}

// Search words that would change the meaning of a CirrusSearch query.
export const sanitizeQuery = (text: string): string =>
  text.replace(/[\\"~*?:|&(){}\[\]^<>]/g, " ").replace(/\s+/g, " ").trim();

// Catalog filters are CirrusSearch queries. Every query is limited to videos.
export const withVideoFilter = (query: string): string => {
  const text = (query || "").trim();
  return /filetype:video/i.test(text) ? text : `filetype:video ${text}`.trim();
};

export const buildSearchUrl = (
  query: string,
  page: number,
  sort = SORT_ORDERS.relevance,
  limit = 24,
): string => {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: withVideoFilter(query),
    gsrlimit: String(limit),
    gsroffset: String(Math.max(0, page - 1) * limit),
    gsrsort: sort,
    prop: "imageinfo",
    iiprop: "url|size|mime|mediatype|extmetadata",
    iiurlwidth: "480",
  });
  return `${API}?${params.toString()}`;
};

export const buildPageUrl = (title: string): string => {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: title,
    prop: "imageinfo|videoinfo",
    iiprop: "url|size|mime|mediatype|extmetadata",
    iiurlwidth: "640",
    viprop: "derivatives|timedtext",
  });
  return `${API}?${params.toString()}`;
};

// Links are the file's wiki address, e.g. https://commons.wikimedia.org/wiki/File:Sintel.webm
export const makeLink = (title: string): string =>
  `${COMMONS}/wiki/${encodeURIComponent(title.replace(/ /g, "_")).replace(/%3A/gi, ":")}`;

export const parseLink = (link: string): string => {
  const path = link.replace(/^https?:\/\/commons\.wikimedia\.org\/wiki\//i, "");
  const title = decodeURIComponent(path).replace(/_/g, " ").trim();
  return /^file:/i.test(title) ? title : `File:${title}`;
};

export const absoluteUrl = (url?: string): string => {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${COMMONS}${url}`;
  return url;
};

export const displayName = (title: string): string =>
  title.replace(/^file:/i, "").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_/g, " ").trim();

export const stripHtml = (html: string | undefined, providerContext: ProviderContext): string => {
  if (!html) return "";
  const $ = providerContext.cheerio.load(`<div>${html.replace(/<br\s*\/?>/gi, "\n")}</div>`);
  return $("div").text().replace(/\n{3,}/g, "\n\n").trim();
};

export const meta = (page: CommonsPage, key: string): string =>
  page.imageinfo?.[0]?.extmetadata?.[key]?.value || "";

export const licenseName = (page: CommonsPage): string => meta(page, "LicenseShortName");

// Commons marks public-domain files "Copyrighted: False"; CC0 and "PD" licence
// names are caught as well.
export const isPublicDomain = (page: CommonsPage): boolean =>
  meta(page, "Copyrighted").toLowerCase() === "false" ||
  /^(public domain|pd\b|cc0)/i.test(licenseName(page));

export const isVideo = (page: CommonsPage): boolean =>
  page.imageinfo?.[0]?.mediatype === "VIDEO" || /^video\//i.test(page.imageinfo?.[0]?.mime || "");

export const sortPages = (pages: CommonsPage[]): CommonsPage[] =>
  [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

export const fetchPage = async (
  title: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<CommonsPage> => {
  const res = await providerContext.axios.get(buildPageUrl(title), {
    headers: apiHeaders(providerContext),
    signal,
  });
  const page: CommonsPage | undefined = res.data?.query?.pages?.[0];
  if (!page || !page.imageinfo?.length) {
    throw new Error(`Wikimedia Commons file not found: ${title}`);
  }
  return page;
};

export const formatSize = (bytes?: number): string => {
  if (!bytes) return "";
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${Math.round(bytes / 1024 ** 2)} MB`;
};
