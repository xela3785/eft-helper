export interface Item {
  id: string;
  shortName: string;
  name: string;
  link?: string;
  wikiLink?: string;
  image512pxLink?: string;
  gridImageLink?: string;
  iconLink?: string;
  image8xLink?: string;
  backgroundColor?: string;
}

export interface RequirementItem {
  id: string;
  count: number;
  quantity: number;
  attributes?: Array<{
    name: string;
    value: string;
  }>;
  item: Item;
}

export interface HideoutCraft {
  id: string;
  duration: number;
  requiredItems: RequirementItem[];
  rewardItems: RequirementItem[];
}

export interface HideoutStationRef {
  id: string;
  name: string;
}

export interface RequirementHideoutStationLevel {
  id: string;
  level: number;
  station: HideoutStationRef;
}

export interface HideoutModuleLevel {
  id: string;
  level: number;
  description: string;
  constructionTime: number;
  itemRequirements: RequirementItem[];
  stationLevelRequirements?: RequirementHideoutStationLevel[];
  skillRequirements?: unknown[];
  traderRequirements?: unknown[];
  crafts?: HideoutCraft[];
}

export interface HideoutModule {
  id: string;
  name: string;
  normalizedName: string;
  imageLink?: string;
  levels: HideoutModuleLevel[];
}
