export type AccessCategoryId = "automobileOnly" | "motorOnly" | "unrestricted";

export type AccessCategory = {
  id: AccessCategoryId;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
};

export type Spot = {
  id: string;
  number: number;
  name: string;
  area: string;
  scene: string;
  lat: number;
  lng: number;
  access: AccessCategoryId;
  accessNote?: string;
  wikiQuery: string;
};

export type SpotSet = {
  id: string;
  version: number;
  title: string;
  shortTitle: string;
  intro: string;
  sourceLabel: string;
  sourceUrl: string;
  footerNotice: string;
  mapCenter: [number, number];
  mapZoom: number;
  shareText: (count: number) => string;
  categories: AccessCategory[];
  spots: Spot[];
};
