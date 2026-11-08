import { Info, ProviderContext } from "../types";
import {
  absoluteUrl,
  displayName,
  fetchPage,
  licenseName,
  makeLink,
  meta,
  parseLink,
  stripHtml,
} from "./api";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const title = parseLink(link);
  const page = await fetchPage(title, providerContext);
  const info = page.imageinfo![0];

  const description =
    stripHtml(meta(page, "ImageDescription"), providerContext) ||
    stripHtml(meta(page, "ObjectName"), providerContext);
  const author = stripHtml(meta(page, "Artist"), providerContext);
  const year = meta(page, "DateTimeOriginal").match(/\b(1[89]|20)\d{2}\b/)?.[0] || "";
  const watchLink = makeLink(page.title);

  return {
    title: displayName(page.title),
    synopsis: description,
    image: absoluteUrl(info.thumburl),
    imdbId: "",
    type: "movie",
    tags: [licenseName(page), year, author].filter(Boolean).slice(0, 6),
    linkList: [
      {
        title: "Video",
        directLinks: [{ title: "Video", link: watchLink, type: "movie" }],
      },
    ],
    webUrl: watchLink,
  };
};
