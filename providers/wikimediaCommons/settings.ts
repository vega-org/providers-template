import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "licenses",
      type: "select",
      label: "Allowed licenses",
      description: "Everything on Wikimedia Commons is freely licensed; choose how strict to be",
      options: [
        { label: "Public domain and Creative Commons", value: "open" },
        { label: "Public domain only", value: "publicDomain" },
      ],
      defaultValue: "open",
    },
    {
      key: "sort",
      type: "select",
      label: "Order",
      description: "How lists and search results are sorted",
      options: [
        { label: "Best match", value: "relevance" },
        { label: "Recently added", value: "newest" },
        { label: "Most linked", value: "linked" },
      ],
      defaultValue: "relevance",
    },
  ];
};
