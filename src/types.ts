export type CsvRow = Record<string, string>;

export type IsoDateString = string;

export type Priority = "high" | "medium" | "low";

export type EngagementCategory =
  | "high"
  | "moderate"
  | "low"
  | "inactive";

export type RetentionEngagementBand =
  | "low"
  | "limited"
  | "moderate"
  | "high";

export type PageName =
  | "home"
  | "upload"
  | "recruitment"
  | "retention"
  | "counties"
  | "providers"
  | "methodology";

export interface ChildRecord {
  id_child: string;
  removal_county: string;
  age: number | null;
  ageGroup: string;
  removal_date: Date | null;
  discharge_date: Date | null;
}

export interface PlacementRecord {
  id_child: string;
  removal_county: string;
  placement_county: string;
  resource_type_on_this_placement: string;
  placement_start_date: string;
  placement_end_date: string;
  id_provider: string | null;
  start: Date | null;
  end: Date;
  length: number;
}

export interface ProviderRecord {
  id_provider: string;
  county_provider: string;
  license_start_date: string;
  license_end_date: string;
  licensedDays: number;
  activeDays: number;
  engagement: number;
  licenseStart: Date | null;
  licenseEnd: Date | null;
  daysUntilExpiration: number | null;
  minAge: number;
  maxAge: number;
  isLicensed: boolean;
  engagementCategory: EngagementCategory;
  retentionEngagementBand: RetentionEngagementBand;
  lastPlacementActivityDate: Date | null;
  daysSinceLastActivity: number | null;
  inactive30: boolean;
  inactive60: boolean;
  inactive90: boolean;
  outreachScore: number;
  outreachPriority: Priority;
  outreachReasons: string[];
}

export interface AgeGap {
  group: string;
  demand: number;
  supply: number;
  ratio: number;
}

export interface CountyPlacementStats {
  totalPlacements: number;
  uniqueChildren: number;
  kinshipPlacements: number;
  kinshipRate: number;
  childrenWithTwoPlusPlacements: number;
  childrenWithTwoPlusPlacementsRate: number;
  childrenWithThreePlusPlacements: number;
  childrenWithThreePlusPlacementsRate: number;
}

export interface RecruitmentEvents {
  netHomeLoss: boolean;
  highOutOfCounty: boolean;
  expiringSoon: boolean;
  lowEngagement: boolean;
  recruitmentStalled: boolean;
}

export interface CountyRecruitmentMetrics {
  score: number;
  events: RecruitmentEvents;
  endedLicensesLast6Months: number;
  newLicensesLast6Months: number;
  netLicenseChangeLast6Months: number;
  outOfCountyPlacements: number;
  totalFosterPlacements: number;
  outOfCountyRate: number;
  expiringWithin30Days: number;
  lowEngagementHomes: number;
  lowEngagementRate: number;
  recentFosterPlacements: number;
}

export interface CountyRecord {
  name: string;
  children: number;
  licensedHomes: number;
  activeHomes: number;
  inactiveHomes: number;
  childrenPerActive: number;
  outRate: number;
  newLicenses: number;
  gaps: AgeGap[];
  largestGap: AgeGap;
  recruitmentScore: number;
  priority: Priority;
  placementStats: CountyPlacementStats;
  recruitment: CountyRecruitmentMetrics;
}

export interface ModelSummary {
  licensedHomes: number;
  activeHomes: number;
  childrenInCare: number;
  engagement: number;
  expiring30: number;
  inactive: number;
  highOutreach: number;
}

export interface ApiChildRecord
  extends Omit<
    ChildRecord,
    "removal_date" | "discharge_date"
  > {
  removal_date: IsoDateString | null;
  discharge_date: IsoDateString | null;
}

export interface ApiPlacementRecord
  extends Omit<PlacementRecord, "start" | "end"> {
  start: IsoDateString | null;
  end: IsoDateString;
}

export interface ApiProviderRecord
  extends Omit<
    ProviderRecord,
    | "licenseStart"
    | "licenseEnd"
    | "lastPlacementActivityDate"
  > {
  licenseStart: IsoDateString | null;
  licenseEnd: IsoDateString | null;
  lastPlacementActivityDate: IsoDateString | null;
}

export interface AnalyticsApiResponse {
  reportingDate: IsoDateString;
  children: ApiChildRecord[];
  placements: ApiPlacementRecord[];
  providers: ApiProviderRecord[];
  fosterPlacements: ApiPlacementRecord[];
  currentChildren: ApiChildRecord[];
  counties: CountyRecord[];
  summary: ModelSummary;
}

export interface AppModel {
  reportingDate: Date;
  children: ChildRecord[];
  placements: PlacementRecord[];
  providers: ProviderRecord[];
  fosterPlacements: PlacementRecord[];
  currentChildren: ChildRecord[];
  counties: CountyRecord[];
  childById: Map<string, ChildRecord>;
  providerById: Map<string, ProviderRecord>;
  summary: ModelSummary;
}

export interface UploadFiles {
  child?: File;
  placement?: File;
  provider?: File;
}