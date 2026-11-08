import { ProviderContext, Stream, TextTracks } from "../types";
import { absoluteUrl, Derivative, fetchPage, formatSize, parseLink, TimedText } from "./api";

const subtitleTracks = (timedtext: TimedText[] = []): TextTracks =>
  timedtext
    .filter((t) => t.src)
    .map((t) => {
      const src = absoluteUrl(t.src);
      // Commons serves its own subtitle pages as SRT or WebVTT.
      const isSrt = /srt/i.test(t.type || "") || /trackformat=srt/i.test(src);
      return {
        title: t.title || t.shorttitle || t.srclang || "Subtitles",
        language: t.srclang || t.shorttitle || "und",
        type: isSrt ? ("application/x-subrip" as const) : ("text/vtt" as const),
        uri: src,
      };
    });

const containerOf = (mime: string): string => (mime.split(";")[0].split("/")[1] || "").toLowerCase();

// Players handle MP4 best, then WebM; other containers come last.
const FORMAT_RANK = ["mp4", "webm", "ogg", "ogv"];

const rankOf = (mime: string): number => {
  const i = FORMAT_RANK.indexOf(containerOf(mime));
  return i === -1 ? FORMAT_RANK.length : i;
};

const toStream = (
  url: string,
  mime: string,
  height: number,
  size: number | undefined,
  label: string,
  subtitles: TextTracks,
): Stream => {
  const container = containerOf(mime).toUpperCase() || "VIDEO";
  const tags = [height ? `${height}p` : "", container, formatSize(size)].filter(Boolean);
  return {
    server: label ? `${container} ${label}` : container,
    link: url,
    type: "mp4",
    quality: height ? String(height) : undefined,
    tags,
    tag: tags.join(" • "),
    ...(subtitles.length ? { subtitles } : {}),
  };
};

export const getStream = async function ({
  link,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const page = await fetchPage(parseLink(link), providerContext, signal);
  const info = page.imageinfo![0];
  const subtitles = subtitleTracks(page.videoinfo?.[0]?.timedtext);

  const derivatives: Derivative[] = page.videoinfo?.[0]?.derivatives || [];
  const transcoded = derivatives
    .filter((d) => d.src && /^video\//i.test(d.type || ""))
    .map((d) => ({
      url: absoluteUrl(d.src),
      mime: d.type,
      height: d.height || 0,
      label: d.shorttitle || (d.height ? `${d.height}p` : ""),
    }));

  // Best container first, then highest resolution.
  const streams: Stream[] = [...transcoded]
    .sort((a, b) => rankOf(a.mime) - rankOf(b.mime) || b.height - a.height)
    .map((d) => toStream(d.url, d.mime, d.height, undefined, d.label, subtitles));

  // The uploaded file itself: best quality, but often large or an odd format.
  const original =
    info.url && info.mime
      ? toStream(absoluteUrl(info.url), info.mime, 0, info.size, "Original", subtitles)
      : undefined;

  // Streaming prefers the transcodes (small, widely supported); downloads
  // prefer the original upload.
  const ordered = isDownload
    ? [...(original ? [original] : []), ...streams]
    : [...streams, ...(original ? [original] : [])];

  if (ordered.length === 0) {
    throw new Error(`No playable file for Wikimedia Commons video: ${page.title}`);
  }
  return ordered;
};
