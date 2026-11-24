import type { Post, PostPreview, ProviderContext } from "../types";

const demoPreview: PostPreview = {
  url: "https://mdn.github.io/shared-assets/videos/flower.mp4",
  type: "video",
};

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
  // Use filter and page to fetch items
  // Here we just return mock data for demonstration
  return [
    {
      title: "Example Post 1",
      link: "https://example.com/post-1",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
      preview: demoPreview,
    },
    {
      title: "Example Post 2",
      link: "https://example.com/post-2",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
    },
  ];
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
  // Use searchQuery to fetch relevant items
  return [
    {
      title: `Search Result for ${searchQuery}`,
      link: "https://example.com/search-result",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
      preview: demoPreview,
    },
  ];
};
