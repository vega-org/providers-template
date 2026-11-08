// Offline tests for the PeerTube provider: axios is replaced by a fake, so
// they need no network. Run with `npm run test:unit`.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const vm = require("node:vm");
const { buildSync } = require("esbuild");

function load(entry) {
  const code = buildSync({ entryPoints: [entry], bundle: true, platform: "browser", format: "cjs", write: false })
    .outputFiles[0].text;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, Error, Promise, console });
  return module.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

const api = load("providers/peertube/api.ts");
const { getPosts, getSearchPosts } = load("providers/peertube/posts.ts");
const { getMeta } = load("providers/peertube/meta.ts");
const { getStream } = load("providers/peertube/stream.ts");
const { getSettingsSchema } = load("providers/peertube/settings.ts");

function context(replies, settings = {}) {
  const calls = [];
  return {
    calls,
    ctx: {
      commonHeaders: {},
      kvStore: { get: async (key) => settings[key] },
      axios: {
        get: async (url) => {
          calls.push(url);
          for (const [part, data] of Object.entries(replies)) if (url.includes(part)) return { data };
          throw Error("Unexpected request " + url);
        },
      },
    },
  };
}

const video = {
  uuid: "abc-123",
  name: "Open Film",
  previewPath: "/lazy-static/previews/abc.jpg",
  duration: 5400,
  category: { id: 2, label: "Films" },
  licence: { id: 7, label: "Public Domain Dedication" },
  channel: { displayName: "Open Films" },
  tags: ["short"],
  streamingPlaylists: [
    {
      playlistUrl: "https://tube.example/streaming-playlists/hls/abc/master.m3u8",
      files: [{ fileUrl: "https://tube.example/hls/abc-720-fragmented.mp4", resolution: { id: 720, label: "720p" }, size: 100 }],
    },
  ],
  files: [
    { fileUrl: "https://tube.example/static/abc-1080.mp4", fileDownloadUrl: "https://tube.example/dl/abc-1080.mp4", resolution: { id: 1080, label: "1080p" }, size: 2000000000 },
    { fileUrl: "https://tube.example/static/abc-480.mp4", resolution: { id: 480, label: "480p" }, size: 300000000 },
  ],
};

test("link round-trips and remembers its instance", () => {
  const link = api.makeLink("https://tube.example", "abc-123");
  assert.equal(link, "https://tube.example/videos/watch/abc-123");
  assert.deepEqual(plain(api.parseLink(link)), { instance: "https://tube.example", uuid: "abc-123" });
  assert.deepEqual(plain(api.parseLink("https://tube.example/w/shortId")), { instance: "https://tube.example", uuid: "shortId" });
  assert.deepEqual(plain(api.parseLink("abc-123", "https://x.org")), { instance: "https://x.org", uuid: "abc-123" });
});

test("instance setting is normalized", () => {
  assert.equal(api.normalizeInstance(""), "https://framatube.org");
  assert.equal(api.normalizeInstance("tube.example/"), "https://tube.example");
});

test("list url asks for licensed, safe videos only and pages correctly", () => {
  const url = api.buildListUrl("https://tube.example", "categoryOneOf=2", 3, [1, 7], "-trending");
  const params = new URL(url).searchParams;
  assert.equal(params.get("start"), "48");
  assert.equal(params.get("nsfw"), "false");
  assert.equal(params.get("sort"), "-trending");
  assert.deepEqual(plain(params.getAll("licenceOneOf")), ["1", "7"]);
  assert.equal(params.get("categoryOneOf"), "2");
});

test("a catalog's own sort order beats the setting", () => {
  const url = api.buildListUrl("https://tube.example", "sort=-views", 1, [7], "-trending");
  assert.equal(new URL(url).searchParams.get("sort"), "-views");
});

test("posts carry the instance in their link", async () => {
  const c = context({ "/api/v1/videos?": { data: [video] } }, { instance: "https://tube.example" });
  const posts = await getPosts({ filter: "sort=-views", page: 1, providerContext: c.ctx });
  assert.deepEqual(plain(posts), [
    {
      title: "Open Film",
      link: "https://tube.example/videos/watch/abc-123",
      image: "https://tube.example/lazy-static/previews/abc.jpg",
      cornerTag: "1h 30m",
    },
  ]);
});

test("public domain setting narrows the licence filter", async () => {
  const c = context({ "/api/v1/search/videos": { data: [] } }, { instance: "https://tube.example", licenses: "publicDomain" });
  await getSearchPosts({ searchQuery: "film", page: 1, providerContext: c.ctx });
  assert.deepEqual(plain(new URL(c.calls[0]).searchParams.getAll("licenceOneOf")), ["7"]);
});

test("empty search returns nothing without a request", async () => {
  const c = context({});
  assert.deepEqual(plain(await getSearchPosts({ searchQuery: "  ", page: 1, providerContext: c.ctx })), []);
  assert.equal(c.calls.length, 0);
});

test("meta builds a single movie entry", async () => {
  const c = context({
    "/description": { description: "A free film." },
    "/api/v1/videos/abc-123": video,
  });
  const info = await getMeta({ link: "https://tube.example/videos/watch/abc-123", providerContext: c.ctx });
  assert.equal(info.title, "Open Film");
  assert.equal(info.synopsis, "A free film.");
  assert.equal(info.type, "movie");
  assert.equal(info.linkList[0].directLinks[0].link, "https://tube.example/videos/watch/abc-123");
  assert.ok(info.tags.includes("Films"));
});

test("streaming puts HLS first, then MP4 from best resolution", async () => {
  const c = context({
    "/captions": { data: [{ captionPath: "/lazy-static/video-captions/abc-en.vtt", language: { id: "en", label: "English" } }] },
    "/api/v1/videos/abc-123": video,
  });
  const streams = await getStream({ link: "https://tube.example/videos/watch/abc-123", type: "movie", providerContext: c.ctx });
  assert.deepEqual(plain(streams.map((s) => [s.server, s.type])), [
    ["HLS (Auto)", "m3u8"],
    ["MP4 1080p", "mp4"],
    ["MP4 720p", "mp4"],
    ["MP4 480p", "mp4"],
  ]);
  assert.deepEqual(plain(streams[0].subtitles), [
    { title: "English", language: "en", type: "text/vtt", uri: "https://tube.example/lazy-static/video-captions/abc-en.vtt" },
  ]);
});

test("downloads put the largest MP4 first and use the download url", async () => {
  const c = context({ "/captions": { data: [] }, "/api/v1/videos/abc-123": video });
  const streams = await getStream({ link: "https://tube.example/videos/watch/abc-123", type: "movie", providerContext: c.ctx, isDownload: true });
  assert.equal(streams[0].server, "MP4 1080p");
  assert.equal(streams[0].link, "https://tube.example/dl/abc-1080.mp4");
  assert.equal(streams[streams.length - 1].type, "m3u8");
});

test("a broken captions request does not break playback", async () => {
  const c = context({ "/api/v1/videos/abc-123": video });
  const streams = await getStream({ link: "https://tube.example/videos/watch/abc-123", type: "movie", providerContext: c.ctx });
  assert.ok(streams.length > 0);
  assert.equal(streams[0].subtitles, undefined);
});

test("settings expose instance, licenses and sort", async () => {
  const schema = await getSettingsSchema({ providerContext: context({}).ctx });
  assert.deepEqual(plain(schema.map((f) => f.key)), ["instance", "licenses", "sort"]);
});
