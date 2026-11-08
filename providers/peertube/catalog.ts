import { Catalog } from "../types";

// Filters are PeerTube /api/v1/videos query strings; posts.ts adds paging,
// licence and safety parameters. Category ids: 2 Films, 9 Comedy,
// 10 Entertainment, 13 Education, 15 Science & Technology, 17 Kids.
export const catalog: Catalog[] = [
  { title: "Trending", filter: "sort=-trending" },
  { title: "Most Viewed", filter: "sort=-views" },
  { title: "Recently Added", filter: "sort=-publishedAt" },
  { title: "Films", filter: "categoryOneOf=2" },
  { title: "Animation & Kids", filter: "categoryOneOf=17" },
  { title: "Education", filter: "categoryOneOf=13" },
  { title: "Science & Technology", filter: "categoryOneOf=15" },
];

export const genres: Catalog[] = [
  { title: "Films", filter: "categoryOneOf=2" },
  { title: "Comedy", filter: "categoryOneOf=9" },
  { title: "Entertainment", filter: "categoryOneOf=10" },
  { title: "Education", filter: "categoryOneOf=13" },
  { title: "Science & Technology", filter: "categoryOneOf=15" },
  { title: "Kids", filter: "categoryOneOf=17" },
  { title: "Music", filter: "categoryOneOf=1" },
  { title: "Art", filter: "categoryOneOf=4" },
];
