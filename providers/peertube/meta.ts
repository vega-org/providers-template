import { Info, ProviderContext } from "../types";
import {
  absoluteUrl,
  fetchDescription,
  fetchVideo,
  formatDuration,
  getInstance,
  makeLink,
  parseLink,
} from "./api";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fallback = await getInstance(providerContext);
  const { instance, uuid } = parseLink(link, fallback);
  const [video, description] = await Promise.all([
    fetchVideo(instance, uuid, providerContext),
    fetchDescription(instance, uuid, providerContext),
  ]);

  const watchLink = makeLink(instance, video.uuid);
  const tags = [
    video.category?.label,
    video.licence?.label,
    formatDuration(video.duration),
    video.channel?.displayName || video.account?.displayName,
    ...(video.tags || []),
  ]
    .filter((tag): tag is string => Boolean(tag) && tag !== "Unknown")
    .slice(0, 6);

  return {
    title: video.name || uuid,
    synopsis: (description || video.description || "").trim(),
    image: absoluteUrl(instance, video.previewPath || video.thumbnailPath),
    imdbId: "",
    type: "movie",
    tags,
    linkList: [
      {
        title: "Video",
        directLinks: [{ title: "Video", link: watchLink, type: "movie" }],
      },
    ],
    webUrl: watchLink,
  };
};
