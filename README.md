# Vega App Provider Extensions

Welcome to the Vega App Provider Template! Providers are JS scripts that run in a sandbox environment. This repository provides the structure and tools you need to create custom providers (extensions) for the Vega App.

## Getting Started

Follow these steps to create your own providers:

### 1. Fork this Repository
Click the "Fork" button at the top right of this page to create your own copy of this repository.
**Recommended:** Name your forked repository exactly `vega-providers`. This makes it easier to add your providers to the Vega app later!

### 2. Clone Your Fork
Clone your newly forked repository to your local machine:
```sh
git clone https://github.com/YOUR_USERNAME/vega-providers.git
cd vega-providers
npm install
```

### 3. Create Your Provider
There is a sample provider included in the `providers/example` folder to help you get started.
- Review the code in `providers/example` to see how everything is connected.
- Once you're ready, **delete the `example` folder** and create a new folder for your own provider (e.g., `providers/myProvider`).

### 4. Build Your Provider
When you have finished writing your provider's code, you need to bundle it into the `dist/` directory before the app can use it:
```sh
npm run build
```
Make sure to commit and push the built files to your GitHub repository so the app can fetch them.

### 5. Use It In The App
To install your custom provider in the Vega app:
1. Open the app and navigate to the Extensions/Providers settings.
2. If you named your repository exactly `vega-providers`, simply enter your **GitHub Username**.
3. If you used a different name, you must enter the **Full Repository URL** (e.g., `https://github.com/YOUR_USERNAME/your-repo-name`).

---

## Provider Folder Structure

Each provider lives in its own folder under `providers/`:

```
providers/
  myProvider/
    catalog.ts
    meta.ts
    posts.ts
    stream.ts
    episodes.ts (optional)
```

## File Explanations

### 0. `manifest.json`

The `manifest.json` file located in the root of the repository defines the metadata for all providers included in your repository. The Vega app reads this manifest to discover, display, and configure your providers.

**Example `manifest.json`:**
```json
[
  {
    "display_name": "My Provider",
    "value": "myProvider",
    "version": "1.0",
    "icon": "",
    "type": "global",
    "disabled": false
  }
]
```

- **`display_name`**: The human-readable name of your provider shown in the app.
- **`value`**: The internal ID of your provider. This **must exactly match** the name of the folder you created in `providers/` (e.g., `myProvider`).
- **`version`**: The current version of your provider (after changes in a provider bump the version provider will update autmatically in app).
- **`icon`**: An optional URL to an icon image for your provider.
- **`type`**: The scope of your provider (usually set to `"global"`).
- **`disabled`**: If set to `true`, the app will hide and disable this provider.

**Important:** Every time you add a new provider folder to `providers/`, you **must** add a corresponding entry to `manifest.json`!

### 1. `catalog.ts`

<img src="https://github.com/user-attachments/assets/40e5da3d-326d-4f5c-b266-a4167da2a269" width="200"/>

- **Purpose:** Defines the categories or filters available for your provider.
- **How it's used:**
  - The `title` property will be shown as the heading on the home page (e.g., "Popular Movies").
  - The `filter` property is passed to the `getPosts` function in `posts.ts`.
  - For example, if you define `{ title: "Popular Movies", filter: "/category/popular-movies" }`, then home-page heading will show "Popular Movies" and `/category/popular-movies` will be sent to `getPosts` as the `filter` argument. Your `getPosts` implementation should use this to fetch and return the relevant items (e.g., popular movies).
  - The same logic applies to `genres`: each genre object has a `title` (displayed as a heading) and a `filter` (used to fetch genre-specific items).
- **Exports:**
  - `catalog`: An array of objects with `title` and `filter` fields.
  - `genres`: (optional) An array for genre filters.

### 2. `meta.ts`

- **Purpose:** Fetches metadata for a specific item (movie, show, etc.).
- **Exports:**
  - `getMeta({ link, providerContext })`: Returns an `Info` object with details like title, synopsis, image, etc.

### 3. `posts.ts`

- **Purpose:** Fetches lists of items (posts) and handles search.
- **Exports:**
  - `getPosts({ filter, page, providerValue, signal, providerContext })`: Returns an array of `Post` objects for a given filter and page.
  - `getSearchPosts({ searchQuery, page, providerValue, signal, providerContext })`: (optional) Returns search results as an array of `Post` objects.

### 4. `stream.ts`

- **Purpose:** Fetches streaming and downloadable links/sources for a given item.
- **Exports:**
  - `getStream({ link, type, signal, providerContext, isDownload })`: Returns an array of `Stream` objects with streaming info.
  - **`isDownload?: boolean` parameter:**
    - When `true`, the user is downloading the media (quick download or download sheet). Providers can prioritize download-friendly or download-only servers at the top of the returned array.
    - When `false` or omitted, providers should prioritize streaming-friendly servers (e.g. HLS/m3u8, direct streaming web players).
    - **Important:** Always return all available servers regardless of `isDownload`. The app will use the 1st server for Quick Download while enabling the user to choose alternative servers in the download dialog.

### 5. `episodes.ts` (Optional)

- **Purpose:** Handles episode-specific logic for series.
- **When to use:**
  - This file is optional and not required for all providers. Some providers return the full episode list directly in the metadata from `getMeta`, but others require a separate request to fetch episodes for a specific season.
  - If your provider's `getMeta` function cannot return all episodes at once, you can return a `linkList` like this:
    ```js
    linkList: [
      {
        title: "season 1",
        episodesLink: "/season-1",
      },
    ];
    ```
  - When a user selects a season, the `episodesLink` value (e.g., `/season-1`) will be sent as the `url` argument to `getEpisodes` in `episodes.ts`.
  - Your `getEpisodes` function should then fetch and return the list of episodes for that season.
- **Exports:**
  - `getEpisodes({ url, providerContext })`: Returns an array of `EpisodeLink` objects for the given season or episode group.

## `providerContext`?

`providerContext` is an object passed to each function, providing shared utilities and dependencies, such as:

- `axios`: For HTTP requests
- `cheerio`: For HTML parsing
- `commonHeaders`: Standard HTTP headers

This ensures all providers use the same tools and patterns, making code easier to maintain and extend.

## Reference Types

All function signatures and return types should use the interfaces from `providers/types.ts`:

- `Post`, `Info`, `Stream`, `EpisodeLink`, etc.

## Example: `posts.ts`

```ts
import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  // ...implementation...
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  // ...implementation...
};
```

## Example: `catalog.ts`

```ts
// catalog.ts
export const catalog = [
  { title: "Popular Movies", filter: "/category/popular-movies" },
  { title: "Latest TV Shows", filter: "/category/latest-tv-shows" },
];

export const genres = [
  { title: "Action", filter: "/genre/action" },
  { title: "Drama", filter: "/genre/drama" },
];
```

## Example: `meta.ts`

```ts
// meta.ts
import { Info, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  // Fetch and parse metadata for the item
  // ...implementation...
  return {
    title: "Example Movie",
    synopsis: "A sample synopsis.",
    image: "https://example.com/image.jpg",
    imdbId: "tt1234567",
    type: "movie",
    linkList: [],
  };
};
```

## Example: `stream.ts`

```ts
// stream.ts
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
  // Fetch and return streaming sources
  // If isDownload is true, place download-optimized servers first:
  // const servers = ...
  return [
    {
      server: "ExampleServer",
      link: "https://example.com/stream.m3u8",
      type: "m3u8",
      quality: "1080",
    },
  ];
};
```

## Example: `episodes.ts` (Optional)

```ts
// episodes.ts
import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  // Fetch and return episode links
  // ...implementation...
  return [
    { title: "Episode 1", link: "https://example.com/ep1" },
    { title: "Episode 2", link: "https://example.com/ep2" },
  ];
};
```

## About `linkList` in `meta.ts`

The `linkList` property in the object returned by `getMeta` is used to describe available seasons, episodes, or direct download/stream links for the item.

<img src="https://github.com/user-attachments/assets/f5dc31fc-0701-4d97-8056-01a58ecdefc0" width="200"/>

- Each entry in `linkList` can represent a season or anything you want; it will be shown in the dropdown.
- If your provider requires an extra request to fetch episodes for a season, set the `episodesLink` property. When the user selects that season, the app will call `getEpisodes` with this value.
- If your provider does not require an extra request (i.e., you already have all episode links), you can return them directly in the `directLinks` array. Each `directLinks` entry should have a `link`, `title`, and `type` (e.g., "movie" or "series").
- The `quality` property can be used to indicate video quality (e.g., "1080").

### Example

```js
linkList: [
  {
    title: "Season 2",
    episodesLink: "",
    directLinks: [
      {
        link: "https://example.com/download",
        title: "Episode 1",
        type: "movie",
      },
      // ...more episodes or links
    ],
    quality: "1080",
  },
];
```

- If you use `directLinks`, the app will send the selected link directly to `getStream` when needed, skipping the need for an extra episode request.
- If you use `episodesLink`, the app will call `getEpisodes` to fetch the episode list for that season or group.

This gives you flexibility to support both providers that need extra requests for episodes and those that can return all links up front.

---

# Advanced: Settings & Key-Value Storage

Providers can expose custom settings in the Vega app (such as custom mirror URLs, quality preferences, resolution filters, API keys, or toggles) and persist state across sessions using the built-in Key-Value Store (`kvStore`).

## 1. Provider Settings (`settings.ts`)

To provide a native settings UI in the Vega App's **Provider Settings**, add a `settings.ts` file inside your provider folder.

### `settings.ts` Signature
Export an async function `getSettingsSchema`:

```ts
import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    // Array of settings field definitions
  ];
};
```

### Supported Field Types

| Field Type | UI Component | Value Type | Properties |
|---|---|---|---|
| `'select'` | Native Dropdown Menu | `string` | `key`, `label`, `description?`, `options: { label, value }[]`, `defaultValue?` |
| `'multiselect'` | Checkbox List Group | `string[]` | `key`, `label`, `description?`, `options: { label, value }[]`, `defaultValue?: string[]` |
| `'toggle'` | Switch Toggle (On/Off) | `boolean` | `key`, `label`, `description?`, `defaultValue?: boolean` |
| `'text'` | Text Input Field | `string` | `key`, `label`, `description?`, `placeholder?`, `defaultValue?: string` |
| `'number'` | Numeric Input Field | `number` | `key`, `label`, `description?`, `min?`, `max?`, `defaultValue?: number` |

### Complete Example: `settings.ts`

```ts
import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "preferredQuality",
      type: "select",
      label: "Preferred Streaming Quality",
      description: "Default streaming quality when multiple are available",
      options: [
        { label: "Auto (Best Available)", value: "auto" },
        { label: "1080p Full HD", value: "1080" },
        { label: "720p HD", value: "720" },
        { label: "480p SD", value: "480" },
      ],
      defaultValue: "auto",
    },
    {
      key: "allowedResolutions",
      type: "multiselect",
      label: "Allowed Resolutions",
      description: "Choose which video resolutions to show in playback sources",
      options: [
        { label: "4K Ultra HD (2160p)", value: "2160" },
        { label: "1080p Full HD", value: "1080" },
        { label: "720p HD", value: "720" },
        { label: "480p SD", value: "480" },
      ],
      defaultValue: ["2160", "1080", "720"],
    },
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Mirror Domain",
      description: "Override default domain if main website is blocked in your region",
      placeholder: "https://my-mirror.com",
      defaultValue: "",
    },
    {
      key: "autoSubtitles",
      type: "toggle",
      label: "Auto-enable English Subtitles",
      description: "Automatically load English subtitles when available",
      defaultValue: true,
    },
    {
      key: "requestTimeout",
      type: "number",
      label: "Request Timeout (seconds)",
      description: "Maximum response wait time for requests",
      defaultValue: 15,
      min: 5,
      max: 60,
    },
  ];
};
```

## 2. Key-Value Storage (`providerContext.kvStore`)

Each provider has access to an isolated, persistent Key-Value Store through `providerContext.kvStore`. 

Values configured by the user via the Settings modal are automatically saved to this store under the corresponding `key`. You can also write, read, and delete custom data directly in your scraper functions.

### `kvStore` API

```ts
interface ProviderKvStore {
  // Retrieve a stored value by key
  get: <T = unknown>(key: string) => Promise<T | undefined>;

  // Store a value (serializable objects, arrays, primitives)
  set: (key: string, value: unknown) => Promise<void>;

  // Delete a specific key
  delete: (key: string) => Promise<boolean>;

  // List all stored keys for this provider
  keys: () => Promise<string[]>;

  // Clear all stored data for this provider
  clear: () => Promise<void>;
}
```

### Reading Settings Inside Scrapers (`posts.ts`, `stream.ts`, etc.)

```ts
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
  const { axios, kvStore } = providerContext;

  // 1. Read user configured settings
  const customDomain = (await kvStore.get<string>("baseUrlOverride")) || "https://example.com";
  const preferredQuality = (await kvStore.get<string>("preferredQuality")) || "auto";
  const allowedResolutions = (await kvStore.get<string[]>("allowedResolutions")) || ["1080", "720"];

  // 2. Use in scraper requests
  const response = await axios.get(`${customDomain}${link}`);
  // ... parse streams and filter by allowedResolutions ...

  return streams;
};
```

---

# How to Test Your Provider

## Test with CLI

1. Run `npm test -- provider_name` (example: `npm test -- showbox`)
   - This will do full testing by picking random posts and episodes and testing end-to-end.
2. Run `npm run test:provider -- provider_name function_name` (example: `npm run test:provider -- showbox getPosts`)
   - This is for testing a single function, such as getPosts, getSearchPosts, getStream, etc. After entering manually, enter the input.

### WAF verification and browser configuration

Use Node.js 20.12 or newer, run `npm install`, and install Microsoft Edge or Google Chrome locally. The CLI uses `playwright-core` with your installed browser; no browser download is required.

For a custom browser location, copy `.env.example` to `.env` in the repository root and set an absolute executable path:

```dotenv
VEGA_BROWSER_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
```

Both CLI commands automatically load this `.env` file. You can also set `VEGA_BROWSER_PATH` in your shell; shell values take precedence. Leave it empty to find Edge, then Chrome automatically. Custom paths support Chromium browsers (Chrome, Edge, Chromium, Brave); Firefox and Safari are unsupported. An invalid custom path reports an error. Local `.env` files are ignored by Git.

```sh
npm run test:provider -- myProvider getPosts --rebuild
npm run test:provider -- myProvider getStream --rebuild
npm test -- myProvider
```

Both test commands provide `providerContext.openWebView(url, options)`. When your provider calls it, a visible browser opens so you can complete the verification. No extra WAF flag is needed. Press Enter in the terminal when finished, or use `waitForCookie` or an injected script to complete automatically:

```ts
const result = await providerContext.openWebView(url, {
  title: "Complete security verification",
  waitForCookie: "cf_clearance",
  timeoutMs: 120000,
});
// result.data contains rendered HTML, or data sent by the injected script.
// result.cookies, result.cookieMap, result.url and result.userAgent are available.
```

`headers` and `injectedJavaScript` are supported. Injected scripts can return data using `window.ReactNativeWebView.postMessage(JSON.stringify({ __waf: true, data: value }))`; scripts are installed again after navigation. Closing the browser cancels the request, and verification times out after two minutes by default. This interactive helper requires a desktop browser session. It does not automatically solve challenges or reproduce every mobile WebView behavior. Keep browser dependencies in the test harness; provider code should only call the injected `providerContext` API.

## Test in App

### Recommended: add the dev server as a provider source

Use this method with Vega mobile and desktop builds that support HTTP provider sources. It uses the normal provider installation flow and needs no app code changes or test mode.

1. Build your provider and start the server from the template folder:
   ```sh
   npm run build
   npm run dev
   ```
   Alternatively, run `npm run auto` to build, start the server, and rebuild when provider files change.
2. In the app, open **Settings > Provider Manager > Available Providers**, choose **Add Provider Source** (the plus button), and enter the server URL:
   - Desktop on the same computer: `http://localhost:3001`
   - Mobile or another computer: the printed **Mobile Test URL**, for example `http://192.168.1.20:3001`
   - You can also enter the full manifest URL, such as `http://192.168.1.20:3001/manifest.json`.
3. Select the added source and install your provider. Its entry must be present in `manifest.json`, and its built files must be available under `dist/`.
4. Browse, search, and play in the app to test the provider. WAF verification uses the app's own browser/WebView; the CLI's `VEGA_BROWSER_PATH` setting does not apply here.
5. After changing provider code, rebuild it (or let `npm run auto` rebuild), then update or reinstall the provider in the app. Normal source installation uses installed files and does not hot reload. Increase the provider's manifest version when testing the normal update flow.

For a phone or another computer, keep both devices on the same network and allow the dev server through your computer's firewall on port `3001`. On a phone, `localhost` points to the phone, so use the computer's local IP instead. Keep the server running while fetching or updating provider files. If your installed app rejects HTTP sources, update to a build with HTTP source support or use the secondary method below when building the app yourself.

### Secondary: app developer test mode

Use this method when developing the Vega app itself or when you need its test-mode provider loading behavior. It requires access to the app source and rebuilding the app.

1. Start the provider server with `npm run auto`, or run `npm run build` followed by `npm run dev`.
2. In the mobile or desktop app project, open `src/lib/services/ExtensionManager.ts` and configure:
   ```ts
   private testMode = true;
   private baseUrlTestMode = "http://192.168.1.20:3001";
   ```
   Use the server's printed Mobile Test URL for a phone, or `http://localhost:3001` for desktop on the same computer. Preserve the file's existing quote style.
3. Rebuild and run the app, then test your local providers. Keep the server running and rebuild provider files after edits, or use `npm run auto`.
4. Restore `testMode = false` when finished, before creating a normal app build.

---

This workflow allows you to quickly test and debug new providers before deploying them.

Follow this structure and naming convention to ensure your provider integrates smoothly with the project.

## DRM streams

Providers can return `Stream.drm` for inline ClearKey or license-server DRM.
See [DRM configuration, examples, and platform limits](docs/provider-drm.md).
