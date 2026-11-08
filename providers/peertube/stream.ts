import { ProviderContext, Stream, TextTracks } from "../types";
import {
  absoluteUrl,
  fetchVideo,
  formatSize,
  getInstance,
  parseLink,
  PeerTubeFile,
  PeerTubeVideo,
} from "./api";

const fetchSubtitles = async (
  instance: string,
  uuid: string,
  providerContext: ProviderContext,
  signal?: AbortSignal,
): Promise<TextTracks> => {
  try {
    const res = await providerContext.axios.get(
      `${instance}/api/v1/videos/${encodeURIComponent(uuid)}/captions`,
      { headers: providerContext.commonHeaders, signal },
    );
    const captions: any[] = res.data?.data || [];
    return captions
      .filter((c) => c.captionPath)
      .map((c) => ({
        title: c.language?.label || c.language?.id || "Subtitles",
        language: c.language?.id || "und",
        type: "text/vtt" as const,
        uri: absoluteUrl(instance, c.captionPath),
      }));
  } catch {
    return [];
  }
};

const fileStream = (
  instance: string,
  file: PeerTubeFile,
  subtitles: TextTracks,
  isDownload?: boolean,
): Stream => {
  const height = file.resolution?.id || 0;
  const tags = [height ? `${height}p` : "", "MP4", formatSize(file.size)].filter(Boolean);
  return {
    server: `MP4 ${file.resolution?.label || ""}`.trim(),
    link: absoluteUrl(instance, isDownload && file.fileDownloadUrl ? file.fileDownloadUrl : file.fileUrl),
    type: "mp4",
    quality: height ? String(height) : undefined,
    tags,
    tag: tags.join(" • "),
    ...(subtitles.length ? { subtitles } : {}),
  };
};

const collectFiles = (video: PeerTubeVideo): PeerTubeFile[] => {
  const direct = video.files || [];
  const fromPlaylists = (video.streamingPlaylists || []).flatMap((p) => p.files || []);
  const seen = new Set<string>();
  return [...direct, ...fromPlaylists].filter((f) => {
    if (!f.fileUrl || /\.m3u8(\?|$)/i.test(f.fileUrl) || seen.has(f.fileUrl)) return false;
    seen.add(f.fileUrl);
    return true;
  });
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
  const fallback = await getInstance(providerContext);
  const { instance, uuid } = parseLink(link, fallback);
  const [video, subtitles] = await Promise.all([
    fetchVideo(instance, uuid, providerContext, signal),
    fetchSubtitles(instance, uuid, providerContext, signal),
  ]);

  const streams: Stream[] = [];

  // HLS adapts to the viewer's connection, so it is the best streaming option.
  const playlists = (video.streamingPlaylists || []).filter((p) => p.playlistUrl);
  const hls: Stream[] = playlists.map((p, i) => ({
    server: playlists.length > 1 ? `HLS (Auto) ${i + 1}` : "HLS (Auto)",
    link: absoluteUrl(instance, p.playlistUrl),
    type: "m3u8",
    tags: ["Auto quality", "HLS"],
    tag: "Auto quality • HLS",
    ...(subtitles.length ? { subtitles } : {}),
  }));

  // Plain MP4 files, best resolution first. Downloads prefer these.
  const files = collectFiles(video)
    .sort((a, b) => (b.resolution?.id || 0) - (a.resolution?.id || 0))
    .map((file) => fileStream(instance, file, subtitles, isDownload));

  streams.push(...(isDownload ? [...files, ...hls] : [...hls, ...files]));

  if (streams.length === 0) {
    throw new Error(`No playable file for PeerTube video: ${uuid}`);
  }
  return streams;
};
