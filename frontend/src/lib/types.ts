// ─── Primitives ───────────────────────────────────────────────────────────────

export type SegmentName = 'Champion' | 'Loyal' | 'Promising' | 'New' | 'At-Risk' | 'Lost'
export type RiskBand = 'Low' | 'Medium' | 'High' | 'Critical'
export type UploadMode = 'cleaned' | 'raw'
export type StepStatus = 'waiting' | 'running' | 'done'

// ─── Shared ────────────────────────────────────────────────────────────────────

export interface Segment {
  name: SegmentName
  count: number
  share: number
}

export interface MonthlyPoint {
  month: string
  sales: number
  returns: number
  returnRate: number
  partial?: boolean
}

export interface DailyPoint {
  date: string
  sales: number
  flagged: boolean
}

export interface RiskCustomer {
  id: string
  segment: SegmentName
  band: RiskBand
  score: number
  rfmDecay: number
  returnRate: number
  gapTrend: number
  anomaly: number
  revenue: number
  orders: number
  firstPurchase: string
  lastPurchase: string
  avgGap: number
}

export interface Kpi {
  key: string
  label: string
  value: string
  prefix?: string
  tooltip: string
  badge?: string
  delta?: string
  note?: string
  trend: number[]
  tone: 'accent' | 'accent-2' | 'warning' | 'positive'
}

// ─── Dataset ───────────────────────────────────────────────────────────────────

export interface Dataset {
  id: string
  name: string
  customers: number
  rows: number
  dateRange: { from: string; to: string }
  kpis: Kpi[]
  monthly: MonthlyPoint[]
  segments: Segment[]
  daily: DailyPoint[]
  riskCustomers: RiskCustomer[]
  leakage: { gross: number; returns: number; net: number }
}

export interface DatasetSummary {
  id: string
  name: string
  uploaded: string
  rows: number
  status: 'Processed' | 'Archived'
  primary?: boolean
}

// ─── Segments ──────────────────────────────────────────────────────────────────

export interface RfmCustomer {
  id: string
  recency: number
  frequency: number
  monetary: number
  r: number
  f: number
  m: number
  rfmScore: number
  segment: SegmentName
}

// ─── Cohorts ───────────────────────────────────────────────────────────────────

export interface CohortRow {
  label: string       // e.g. "2010-12"
  size: number        // month-0 cohort size
  retention: number[] // [100, 36.5, 32.4, ...] length 13
  revenue: number[]   // revenue retention %
}

// ─── Returns ───────────────────────────────────────────────────────────────────

export interface ReturnRow {
  key: string
  sales: number
  returns: number
  returnRate: number
  flagged: boolean
  salesOnly?: boolean
}

// ─── Products ──────────────────────────────────────────────────────────────────

export interface Product {
  code: string
  name: string
  netRevenue: number
  grossSold: number
  returnedValue: number
  returnRate: number
  attachRate: number
  buyers: number
}

// ─── Anomalies ─────────────────────────────────────────────────────────────────

export interface AnomalyDay {
  date: string
  sales: number
  mean: number
  std: number
  zScore: number
  flagged: boolean
  direction: 'spike' | 'drop' | null
  affectedCustomers: string[]
}

// ─── Risk ──────────────────────────────────────────────────────────────────────

export interface RiskScore {
  id: string
  segment: SegmentName
  band: RiskBand
  score: number
  rfmDecay: number
  returnRate: number
  gapTrend: number
  anomaly: number
  revenue: number
  mainDriver: string
}

// ─── Journey ───────────────────────────────────────────────────────────────────

export interface JourneyCustomer {
  id: string
  firstPurchase: string
  lastPurchase: string
  orders: number
  revenue: number
  avgGap: number | null
  gapTrend: 'up' | 'down' | 'flat'
  segment: SegmentName
  band: RiskBand
  score: number
}

// ─── Pipeline ──────────────────────────────────────────────────────────────────

export interface FunnelStep {
  label: string
  rows: number
  removed?: number
}

export interface QualityCheck {
  field: string
  issues: number
  status: 'pass' | 'fail'
}

export interface JobRun {
  id: string
  dataset: string
  started: string
  duration: string
  status: 'complete' | 'processing' | 'failed'
}

// ─── Upload ────────────────────────────────────────────────────────────────────

export interface JobStep {
  label: string
  status: StepStatus
}
