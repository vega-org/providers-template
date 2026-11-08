import { Post, ProviderContext } from "../types";
import {
  absoluteUrl,
  apiHeaders,
  buildSearchUrl,
  CommonsPage,
  getPublicDomainOnly,
  getSortOrder,
  isPublicDomain,
  isVideo,
  licenseName,
  makeLink,
  sanitizeQuery,
  sortPages,
  displayName,
} from "./api";

const searchVideos = async (
  query: string,
  page: number,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<Post[]> => {
  const [sort, publicOnly] = await Promise.all([
    getSortOrder(providerContext),
    getPublicDomainOnly(providerContext),
  ]);
  const res = await providerContext.axios.get(buildSearchUrl(query, page, sort), {
    headers: apiHeaders(providerContext),
    signal,
  });
  const pages: CommonsPage[] = res.data?.query?.pages || [];
  return sortPages(pages)
    .filter((p) => isVideo(p) && (!publicOnly || isPublicDomain(p)))
    .map((p) => ({
      title: displayName(p.title),
      link: makeLink(p.title),
      image: absoluteUrl(p.imageinfo?.[0]?.thumburl),
      cornerTag: licenseName(p) || undefined,
    }));
};

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
  return searchVideos(filter, page, providerContext, signal);
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
  const words = sanitizeQuery(searchQuery);
  if (!words) return [];
  return searchVideos(words, page, providerContext, signal);
};
