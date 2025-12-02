
export interface TotalVolumeData {
  total: number | string;
  new: number | string;
  history: number | string;
  unit: string;
}

export interface NodeProgressItem {
  name: string;
  inProgress: number;
  completed: number;
  [key: string]: any;
}

export interface FeedbackData {
  name: string;
  value: number;
  color: string;
  isPlaceholder?: boolean;
  displayValue?: string;
  [key: string]: any;
}

export interface QualityMetric {
  month: string;
  exploration: number; // 勘探
  reserves: number;    // 储量
  development: number; // 开发
  production: number;  // 生产
  engineering: number; // 工程
  drilling: number;    // 钻井
  averageScore: number;
  [key: string]: any;
}

export interface DataListItem {
  label: string;
  value: string;
  isHighlight?: boolean;
}

export interface UserMetric {
  active: number;
  total: number;
  percentage: number;
  isEmpty?: boolean;
}

export interface AppStats {
  systemCalls: number;
  interfaceCount: number;
  pushedVolume: number;
  isEmpty?: boolean;
}

export interface ScenarioItem {
  category: string; // e.g., 勘探, 储量
  finished: number;
  unfinished: number;
  [key: string]: any;
}

export interface DashboardData {
  volume: TotalVolumeData;
  nodes: NodeProgressItem[];
  feedback: FeedbackData[];
  quality: QualityMetric[];
  mainDataList: DataListItem[];
  businessDataList: DataListItem[];
  users: UserMetric;
  appStats: AppStats;
  scenarios: ScenarioItem[];
}