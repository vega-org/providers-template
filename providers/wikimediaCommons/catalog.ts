import { Catalog } from "../types";

// Filters are Wikimedia Commons search queries; posts.ts limits them to videos.
export const catalog: Catalog[] = [
  { title: "Featured Videos", filter: 'incategory:"Featured videos"' },
  { title: "Short Films", filter: '"short film"' },
  { title: "Animation", filter: "animation" },
  { title: "Documentaries", filter: "documentary" },
  { title: "Nature & Wildlife", filter: "nature wildlife" },
  { title: "Science & Space", filter: "science space" },
  { title: "History", filter: "history archive footage" },
];

export const genres: Catalog[] = [
  { title: "Animation", filter: "animation" },
  { title: "Documentary", filter: "documentary" },
  { title: "Nature", filter: "nature" },
  { title: "Animals", filter: "animals" },
  { title: "Space", filter: "space nasa" },
  { title: "Science", filter: "science experiment" },
  { title: "Music", filter: "music concert" },
  { title: "Travel", filter: "travel city" },
];
