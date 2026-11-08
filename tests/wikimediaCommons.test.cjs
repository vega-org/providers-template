// Offline tests for the Wikimedia Commons provider: axios is replaced by a
// fake, so they need no network. Run with `npm run test:unit`.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const vm = require("node:vm");
const { buildSync } = require("esbuild");
const cheerio = require("cheerio");

function load(entry) {
  const code = buildSync({ entryPoints: [entry], bundle: true, platform: "browser", format: "cjs", write: false })
    .outputFiles[0].text;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, Error, Promise, console });
  return module.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

const api = load("providers/wikimediaCommons/api.ts");
const { getPosts, getSearchPosts } = load("providers/wikimediaCommons/posts.ts");
const { getMeta } = load("providers/wikimediaCommons/meta.ts");
const { getStream } = load("providers/wikimediaCommons/stream.ts");
const { getSettingsSchema } = load("providers/wikimediaCommons/settings.ts");

function context(replies, settings = {}) {
  const calls = [];
  return {
    calls,
    ctx: {
      commonHeaders: { "User-Agent": "test" },
      cheerio,
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

const sintel = {
  title: "File:Sintel trailer.webm",
  index: 2,
  imageinfo: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Sintel_trailer.webm",
      thumburl: "https://upload.wikimedia.org/thumb/Sintel_trailer.webm/480px--Sintel_trailer.webm.jpg",
      size: 90000000,
      mime: "video/webm",
      mediatype: "VIDEO",
      extmetadata: {
        LicenseShortName: { value: "CC BY 3.0" },
        Copyrighted: { value: "True" },
        ImageDescription: { value: "<b>Sintel</b> is an open movie.<br>Made with Blender." },
        Artist: { value: '<a href="x">Blender Foundation</a>' },
        DateTimeOriginal: { value: "2010-09-30" },
      },
    },
  ],
  videoinfo: [
    {
      derivatives: [
        { src: "https://upload.wikimedia.org/t/Sintel.webm.480p.vp9.webm", type: 'video/webm; codecs="vp9"', shorttitle: "480P", height: 480 },
        { src: "https://upload.wikimedia.org/t/Sintel.webm.720p.h264.mp4", type: 'video/mp4; codecs="avc1"', shorttitle: "720P", height: 720 },
        { src: "https://upload.wikimedia.org/t/Sintel.webm.480p.h264.mp4", type: 'video/mp4; codecs="avc1"', shorttitle: "480P", height: 480 },
      ],
      timedtext: [{ src: "//commons.wikimedia.org/w/api.php?action=timedtext&lang=en&trackformat=vtt", type: "text/vtt", title: "English (en)", srclang: "en" }],
    },
  ],
};

const publicDomainClip = {
  title: "File:Old reel.ogv",
  index: 1,
  imageinfo: [
    {
      url: "https://upload.wikimedia.org/o/Old_reel.ogv",
      thumburl: "https://upload.wikimedia.org/t/Old_reel.jpg",
      mime: "video/ogg",
      mediatype: "VIDEO",
      extmetadata: { LicenseShortName: { value: "Public domain" }, Copyrighted: { value: "False" } },
    },
  ],
};

const notVideo = { title: "File:Photo.jpg", index: 3, imageinfo: [{ mime: "image/jpeg", mediatype: "BITMAP" }] };

test("link round-trips through the wiki address", () => {
  const link = api.makeLink("File:Sintel trailer.webm");
  assert.equal(link, "https://commons.wikimedia.org/wiki/File:Sintel_trailer.webm");
  assert.equal(api.parseLink(link), "File:Sintel trailer.webm");
  assert.equal(api.parseLink("Sintel_trailer.webm"), "File:Sintel trailer.webm");
});

test("every query is limited to videos", () => {
  assert.equal(api.withVideoFilter("animation"), "filetype:video animation");
  assert.equal(api.withVideoFilter("filetype:video x"), "filetype:video x");
  const params = new URL(api.buildSearchUrl("animation", 3)).searchParams;
  assert.equal(params.get("gsrsearch"), "filetype:video animation");
  assert.equal(params.get("gsroffset"), "48");
  assert.equal(params.get("gsrnamespace"), "6");
});

test("search words cannot break the query", () => {
  assert.equal(api.sanitizeQuery('he said "hi" (now)'), "he said hi now");
});

test("posts keep search order and skip non-videos", async () => {
  const c = context({ "generator=search": { query: { pages: [sintel, notVideo, publicDomainClip] } } });
  const posts = await getPosts({ filter: "animation", page: 1, providerContext: c.ctx });
  assert.deepEqual(plain(posts.map((p) => p.title)), ["Old reel", "Sintel trailer"]);
  assert.equal(posts[1].cornerTag, "CC BY 3.0");
  assert.equal(posts[1].link, "https://commons.wikimedia.org/wiki/File:Sintel_trailer.webm");
});

test("public domain only hides Creative Commons files", async () => {
  const c = context({ "generator=search": { query: { pages: [sintel, publicDomainClip] } } }, { licenses: "publicDomain" });
  const posts = await getSearchPosts({ searchQuery: "reel", page: 1, providerContext: c.ctx });
  assert.deepEqual(plain(posts.map((p) => p.title)), ["Old reel"]);
});

test("empty search makes no request", async () => {
  const c = context({});
  assert.deepEqual(plain(await getSearchPosts({ searchQuery: ' "" ', page: 1, providerContext: c.ctx })), []);
  assert.equal(c.calls.length, 0);
});

test("requests identify the client to Wikimedia", async () => {
  const seen = [];
  const c = context({ "generator=search": { query: { pages: [] } } });
  const original = c.ctx.axios.get;
  c.ctx.axios.get = async (url, config) => (seen.push(config.headers), original(url));
  await getPosts({ filter: "x", page: 1, providerContext: c.ctx });
  assert.match(seen[0]["Api-User-Agent"], /VegaProviders/);
});

test("meta shows a clean description, licence, year and author", async () => {
  const c = context({ "titles=": { query: { pages: [sintel] } } });
  const info = await getMeta({ link: "https://commons.wikimedia.org/wiki/File:Sintel_trailer.webm", providerContext: c.ctx });
  assert.equal(info.title, "Sintel trailer");
  assert.equal(info.synopsis, "Sintel is an open movie.\nMade with Blender.");
  assert.deepEqual(plain(info.tags), ["CC BY 3.0", "2010", "Blender Foundation"]);
  assert.equal(info.linkList[0].directLinks[0].link, "https://commons.wikimedia.org/wiki/File:Sintel_trailer.webm");
});

test("a missing file is reported", async () => {
  const c = context({ "titles=": { query: { pages: [{ title: "File:Nope.webm", missing: true }] } } });
  await assert.rejects(getMeta({ link: "File:Nope.webm", providerContext: c.ctx }), /not found/);
});

test("streams list MP4 first (best resolution), then WebM, then the original", async () => {
  const c = context({ "titles=": { query: { pages: [sintel] } } });
  const streams = await getStream({ link: "File:Sintel trailer.webm", type: "movie", providerContext: c.ctx });
  assert.deepEqual(plain(streams.map((s) => s.server)), ["MP4 720P", "MP4 480P", "WEBM 480P", "WEBM Original"]);
  assert.equal(streams[0].quality, "720");
  assert.deepEqual(plain(streams[0].subtitles), [
    { title: "English (en)", language: "en", type: "text/vtt", uri: "https://commons.wikimedia.org/w/api.php?action=timedtext&lang=en&trackformat=vtt" },
  ]);
});

test("downloads start with the original upload", async () => {
  const c = context({ "titles=": { query: { pages: [sintel] } } });
  const streams = await getStream({ link: "File:Sintel trailer.webm", type: "movie", providerContext: c.ctx, isDownload: true });
  assert.equal(streams[0].server, "WEBM Original");
  assert.equal(streams[0].link, sintel.imageinfo[0].url);
});

test("a file with no transcodes still plays from the original", async () => {
  const c = context({ "titles=": { query: { pages: [publicDomainClip] } } });
  const streams = await getStream({ link: "File:Old reel.ogv", type: "movie", providerContext: c.ctx });
  assert.equal(streams.length, 1);
  assert.equal(streams[0].server, "OGG Original");
});

test("settings expose licences and sort", async () => {
  const schema = await getSettingsSchema({ providerContext: context({}).ctx });
  assert.deepEqual(plain(schema.map((f) => f.key)), ["licenses", "sort"]);
});
