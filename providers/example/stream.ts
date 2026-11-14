import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  type,
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
  // Use the link to fetch streaming sources
  // If isDownload is true, you can place download-friendly/fast direct servers at the top.
  // Omit streams with drm when isDownload is true (DRM playback is online-only).
  // Return all applicable servers; the app uses the 1st server for quick download
  // or lets the user choose from all returned servers in the download dialog.
  // For ClearKey and license-server DRM examples, see docs/provider-drm.md.
  // Add optional drm to a Stream result; no native DRM imports are needed here.
  return [
    {
      server: "ExampleServer",
      link: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      type: "m3u8",
      quality: "1080",
    },
  ];
};
