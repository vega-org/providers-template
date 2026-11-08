import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "instance",
      type: "text",
      label: "PeerTube instance",
      description: "Any PeerTube server, for example https://framatube.org",
      placeholder: "https://framatube.org",
      defaultValue: "https://framatube.org",
    },
    {
      key: "licenses",
      type: "select",
      label: "Allowed licenses",
      description: "Only show videos marked with these licenses",
      options: [
        { label: "Public domain and Creative Commons", value: "open" },
        { label: "Public domain (CC0) only", value: "publicDomain" },
      ],
      defaultValue: "open",
    },
    {
      key: "sort",
      type: "select",
      label: "Order",
      description: "How lists are sorted unless a category sets its own order",
      options: [
        { label: "Trending", value: "trending" },
        { label: "Most viewed", value: "views" },
        { label: "Recently added", value: "recent" },
        { label: "Most liked", value: "likes" },
      ],
      defaultValue: "trending",
    },
  ];
};
