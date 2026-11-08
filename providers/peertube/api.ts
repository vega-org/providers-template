import { ProviderContext } from "../types";

// PeerTube is a federated, open-source video platform. Every instance exposes
// the same public REST API, so one provider can read from any of them.
export const DEFAULT_INSTANCE = "https://framatube.org";

// PeerTube licence ids: 1 CC-BY, 2 CC-BY-SA, 3 CC-BY-ND, 4 CC-BY-NC,
// 5 CC-BY-NC-SA, 6 CC-BY-NC-ND, 7 Public Domain Dedication (CC0).
const LICENSE_FILTERS: Record<string, number[]> = {
  open: [1, 2, 3, 4, 5, 6, 7],
  publicDomain: [7],
};

const SORT_ORDERS: Record<string, string> = {
  trending: "-trending",
  views: "-views",
  recent: "-publishedAt",
  likes: "-likes",
};

export interface PeerTubeVideo {
  uuid: string;
  name: string;
  description?: string | null;
  thumbnailPath?: string;
  previewPath?: string;
  publishedAt?: string;
  duration?: number;
  category?: { id: number | null; label: string };
  licence?: { id: number | null; label: string };
  tags?: string[];
  account?: { displayName?: string };
  channel?: { displayName?: string };
  streamingPlaylists?: { playlistUrl: string; files?: PeerTubeFile[] }[];
  files?: PeerTubeFile[];
}

export interface PeerTubeFile {
  fileUrl: string;
  fileDownloadUrl?: string;
  resolution: { id: number; label: string };
  size?: number;
}

export const normalizeInstance = (value?: string): string => {
  const text = (value || "").trim().replace(/\/+$/, "");
  if (!text) return DEFAULT_INSTANCE;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

export const getInstance = async (providerContext: ProviderContext): Promise<string> =>
  normalizeInstance(await providerContext.kvStore?.get<string>("instance"));

export const getLicenseIds = async (providerContext: ProviderContext): Promise<number[]> => {
  const choice = await providerContext.kvStore?.get<string>("licenses");
  return LICENSE_FILTERS[choice || "open"] || LICENSE_FILTERS.open;
};

export const getSortOrder = async (
  providerContext: ProviderContext,
  fallback = "trending",
): Promise<string> => {
  const choice = await providerContext.kvStore?.get<string>("sort");
  return SORT_ORDERS[choice || fallback] || SORT_ORDERS[fallback];
};

// Catalog filters are small query strings such as "categoryOneOf=2&sort=-views".
// The provider adds paging, licence and safety parameters itself.
export const buildListUrl = (
  instance: string,
  filter: string,
  page: number,
  licenses: number[],
  defaultSort: string,
  count = 24,
): string => {
  const params = new URLSearchParams(filter);
  if (!params.has("sort")) params.set("sort", defaultSort);
  params.set("start", String(Math.max(0, page - 1) * count));
  params.set("count", String(count));
  params.set("nsfw", "false");
  params.delete("licenceOneOf");
  for (const id of licenses) params.append("licenceOneOf", String(id));
  return `${instance}/api/v1/videos?${params.toString()}`;
};

export const buildSearchUrl = (
  instance: string,
  query: string,
  page: number,
  licenses: number[],
  count = 24,
): string => {
  const params = new URLSearchParams();
  params.set("search", query);
  params.set("searchTarget", "local");
  params.set("start", String(Math.max(0, page - 1) * count));
  params.set("count", String(count));
  params.set("nsfw", "false");
  for (const id of licenses) params.append("licenceOneOf", String(id));
  return `${instance}/api/v1/search/videos?${params.toString()}`;
};

export const absoluteUrl = (instance: string, path?: string): string => {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${instance}${path}`;
};

// Links are "<instance>/videos/watch/<uuid>" so a video always knows which
// instance it lives on, even if the user changes the instance setting later.
export const makeLink = (instance: string, uuid: string): string =>
  `${instance}/videos/watch/${uuid}`;

export const parseLink = (
  link: string,
  fallbackInstance = DEFAULT_INSTANCE,
): { instance: string; uuid: string } => {
  const match = link.match(/^(https?:\/\/[^/]+)\/(?:videos\/watch|w)\/([^/?#]+)/i);
  if (match) return { instance: match[1], uuid: decodeURIComponent(match[2]) };
  return { instance: fallbackInstance, uuid: link.trim() };
};

export const fetchVideo = async (
  instance: string,
  uuid: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<PeerTubeVideo> => {
  const res = await providerContext.axios.get(
    `${instance}/api/v1/videos/${encodeURIComponent(uuid)}`,
    { headers: providerContext.commonHeaders, signal },
  );
  if (!res.data?.uuid) throw new Error(`PeerTube video not found: ${uuid}`);
  return res.data as PeerTubeVideo;
};

export const fetchDescription = async (
  instance: string,
  uuid: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<string> => {
  try {
    const res = await providerContext.axios.get(
      `${instance}/api/v1/videos/${encodeURIComponent(uuid)}/description`,
      { headers: providerContext.commonHeaders, signal },
    );
    return String(res.data?.description || "");
  } catch {
    return "";
  }
};

export const formatSize = (bytes?: number): string => {
  if (!bytes) return "";
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${Math.round(bytes / 1024 ** 2)} MB`;
};

export const formatDuration = (seconds?: number): string => {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
