import { Post, ProviderContext } from "../types";
import {
  absoluteUrl,
  buildListUrl,
  buildSearchUrl,
  formatDuration,
  getInstance,
  getLicenseIds,
  getSortOrder,
  makeLink,
  PeerTubeVideo,
} from "./api";

const toPosts = (instance: string, videos: PeerTubeVideo[]): Post[] =>
  videos
    .filter((video) => video.uuid)
    .map((video) => ({
      title: video.name || video.uuid,
      link: makeLink(instance, video.uuid),
      image: absoluteUrl(instance, video.previewPath || video.thumbnailPath),
      cornerTag: formatDuration(video.duration) || undefined,
    }));

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const [instance, licenses, sort] = await Promise.all([
    getInstance(providerContext),
    getLicenseIds(providerContext),
    getSortOrder(providerContext),
  ]);
  const res = await providerContext.axios.get(
    buildListUrl(instance, filter || "", page, licenses, sort),
    { headers: providerContext.commonHeaders, signal },
  );
  return toPosts(instance, res.data?.data || []);
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const query = (searchQuery || "").trim();
  if (!query) return [];
  const [instance, licenses] = await Promise.all([
    getInstance(providerContext),
    getLicenseIds(providerContext),
  ]);
  const res = await providerContext.axios.get(
    buildSearchUrl(instance, query, page, licenses),
    { headers: providerContext.commonHeaders, signal },
  );
  return toPosts(instance, res.data?.data || []);
};
