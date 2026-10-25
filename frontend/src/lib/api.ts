/**
 * SalesLens API client
 * All requests go to VITE_API_URL (default: http://localhost:8000/api/v1)
 *
 * Response field naming: the backend uses camelCase for most fields.
 * We keep them as-is and let TypeScript types document the shapes.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

import type { DatasetSummary, Dataset } from './types'

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const url = new URL(`${BASE}${path}`, origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try { const j = await res.json(); detail = j.detail ?? detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const url = new URL(`${BASE}${path}`, origin)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try { const j = await res.json(); detail = j.detail ?? detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

async function del<T>(path: string): Promise<T> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const url = new URL(`${BASE}${path}`, origin)
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try { const j = await res.json(); detail = j.detail ?? detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

// ─── Response types (matching actual backend JSON) ────────────────────────────

export interface BackendStatus {
  status: 'idle' | 'processing' | 'ready' | 'failed'
  datasetName: string | null
  datasetId?: number | null
  isRawInput: boolean | null
  error: string | null
  cleaningSummary?: UploadResponse['cleaningSummary'] | null
}

export interface UploadResponse {
  ok: boolean
  message: string
  fileType: 'raw' | 'cleaned'
  datasetName: string
  cleaningSummary: {
    originalRows: number
    duplicatesRemoved: number
    missingCustomerIdRemoved: number
    missingEssentialRemoved?: number
    zeroQuantityRemoved: number
    negativePriceRemoved?: number
    nonProductRemoved: number
    finalRows: number
    salesRows: number
    returnRows: number
    grossSales: number
    returnValue?: number
    totalReturns?: number
    netRevenue: number
    fileType?: string
  }
}

export interface BackendKpi {
  activeCustomers: number
  repeatRate: number
  churnRateIndicative: number | null
  churnRate: number | null
  lostPct: number | null
  revRetention: number | null
  netRevenue: number
  grossSales: number
  totalReturns: number
  returnsValue: number
  totalCustomers: number
  returnRate: number
  overallReturnRate: number
  currencySymbol: string
}

export interface BackendMonthlyPoint {
  month: string
  sales: number
  returns: number
  returnRate: number
}

export interface BackendDailyPoint {
  date: string
  sales: number
  mean: number
  std: number
  zScore: number
  flagged: boolean
  direction: 'spike' | 'drop' | null
  affectedCustomerIDs: number[]
}

export interface BackendSegmentDist {
  segment: string
  count: number
  pct: number
}

export interface BackendRiskCustomer {
  customerId: number
  riskScore: number
  riskBand: string
  mainReason: string
  segment: string
}

export interface BackendOverview {
  kpis: BackendKpi
  monthlyTrends: BackendMonthlyPoint[]
  dailySales: BackendDailyPoint[]
  segmentDistribution: BackendSegmentDist[]
  highRiskCustomers: BackendRiskCustomer[]
  insights: string[]
}

export interface BackendJourneyCustomer {
  CustomerID: number
  OrderCount: number
  FirstPurchaseDate: string
  LastPurchaseDate: string
  TotalRevenue: number
  AvgGap: number | null
  GapTrend: 'up' | 'down' | 'flat' | null
}

export interface BackendJourneyPage {
  items: BackendJourneyCustomer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: {
    totalCustomers: number
    avgOrderCount: number
    avgTotalRevenue: number
    avgGapDays: number
  }
}

export interface BackendRfmCustomer {
  CustomerID: number
  Recency: number
  Frequency: number
  Monetary: number
  R_Score: number
  F_Score: number
  M_Score: number
  RFM_Score: number
  Segment: string
}

export interface BackendSegmentsPage {
  items: BackendRfmCustomer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  segmentDistribution: BackendSegmentDist[]
}

export interface BackendCohortRecord {
  CohortMonth: string
  MonthIndex: number
  CohortSize: number
  RetentionPct: number
  RetentionRevPct: number | null
}

export interface BackendCohortsResponse {
  records: BackendCohortRecord[]
  retentionPivot: Record<string, unknown>[]
}

export interface BackendReturnRow {
  Key: string
  KeyType: 'SKU' | 'Segment' | 'Month'
  Sales: number
  Returns: number
  ReturnRate: number
  Flagged: boolean
}

export interface BackendReturnsResponse {
  portfolioAvgReturnRate: number
  totalSales: number
  totalReturns: number
  records: BackendReturnRow[]
}

export interface BackendProduct {
  StockCode: string
  Description: string
  GrossSales: number
  ReturnValue: number
  ReturnedValue: number
  NetRevenue: number
  Buyers: number
  BuyerCount: number
  ReturnRate: number
  RepeatAttachRate: number | null
  TotalQtySold: number
  Category: string
}

export interface BackendProductsPage {
  items: BackendProduct[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  categorySummary: { category: string; count: number }[]
}

export interface BackendReportData {
  revenueAtRisk: number
  highCriticalCount: number
  watchlist: Array<{
    CustomerID: number
    Segment: string
    RiskBand: string
    RiskScore: number
    OrderCount: number
    TotalRevenue: number
  }>
  segmentRevenue: Array<{
    Segment: string
    Monetary: number
    RevenueShare: number
  }>
  currencySymbol: string
}

export interface BackendAnomalyDay {
  Date: string
  Sales: number
  Mean: number
  Std: number
  ZScore: number
  Flagged: boolean
  Direction: 'spike' | 'drop' | null
  AffectedCustomerIDs: number[]
}

export interface BackendAnomaliesResponse {
  method: string
  totalDays: number
  flaggedDays: number
  records: BackendAnomalyDay[]
}

export interface BackendRiskRow {
  CustomerID: number
  RiskScore: number
  RiskBand: string
  MainReason: string
  RFMDecay: number
  ReturnRate: number
  GapTrend: number
  Anomaly: number
}

export interface BackendRiskPage {
  items: BackendRiskRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  weights: { rfm_decay: number; return_rate: number; gap_trend: number; anomaly: number }
}

export interface BackendCustomer360 {
  customerId: number
  journey: {
    CustomerID: number
    OrderCount: number
    FirstPurchaseDate: string
    LastPurchaseDate: string
    TotalRevenue: number
    AvgGap: number | null
  }
  rfm: {
    CustomerID: number
    Recency: number
    Frequency: number
    Monetary: number
    R_Score: number
    F_Score: number
    M_Score: number
    RFM_Score: number
    Segment: string
  }
  risk: {
    CustomerID: number
    RiskScore: number
    RiskBand: string
    MainReason: string
    RFMDecay: number
    ReturnRate: number
    GapTrend: number
    Anomaly: number
  }
  returnRate: number
  purchaseTimeline: { InvoiceNo: string; date: string; value: number }[]
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  /** Upload a file to the backend. Returns the raw Response so caller can handle errors specially. */
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const form = new FormData()
    form.append('file', file)
    // Ensure correct headers for multipart/form-data; fetch sets them automatically.
    const res = await fetch(`${BASE}/datasets/upload`, {
      method: 'POST',
      body: form,
      // Explicitly enable CORS if backend requires it.
      mode: 'cors',
    })
    if (!res.ok) {
      let detail = `Upload failed (${res.status})`
      try { const j = await res.json(); detail = j.detail ?? detail } catch { /* ignore */ }
      throw new Error(detail)
    }
    return res.json()
  },

  getStatus: () => get<BackendStatus>('/datasets/status'),

  getOverview: () => get<BackendOverview>('/datasets/overview'),

  getJourney: (page = 1, pageSize = 50, sortBy = 'TotalRevenue', order: 'asc' | 'desc' = 'desc') =>
    get<BackendJourneyPage>('/datasets/journey', { page, page_size: pageSize, sort_by: sortBy, order }),

  getSegments: (page = 1, pageSize = 100, segment?: string) =>
    get<BackendSegmentsPage>('/datasets/segments', { page, page_size: pageSize, segment }),

  getCohorts: () => get<BackendCohortsResponse>('/datasets/cohorts'),

  getReturns: (keyType?: 'SKU' | 'Segment' | 'Month', flaggedOnly = false) =>
    get<BackendReturnsResponse>('/datasets/returns', { keyType, flaggedOnly }),

  getProducts: (page = 1, pageSize = 100, search?: string, category?: string, sortBy = 'NetRevenue', order: 'asc' | 'desc' = 'desc') =>
    get<BackendProductsPage>('/datasets/products', { page, page_size: pageSize, search, category, sort_by: sortBy, order }),

  getAnomalies: (method: 'rolling' | 'stl' = 'rolling', flaggedOnly = false) =>
    get<BackendAnomaliesResponse>('/datasets/anomalies', { method, flaggedOnly }),

  getRisk: (page = 1, pageSize = 100, band?: string, weights?: { rfm_decay: number; return_rate: number; gap_trend: number; anomaly: number }) =>
    get<BackendRiskPage>('/datasets/risk', { page, page_size: pageSize, band, ...weights }),

  getCustomer360: (customerId: number) =>
    get<BackendCustomer360>(`/datasets/customers/${customerId}`),

  listDatasets: () => get<DatasetSummary[]>('/datasets'),

  getDataset: (id: string) => get<Dataset>(`/datasets/${id}`),

  exportCsvUrl: (table: string) => `${BASE}/datasets/export/${table}.csv`,

  cleanedFileUrl: () => `${BASE}/datasets/cleaned-file`,

  getReportData: () => get<BackendReportData>('/datasets/report-data'),

  deleteDataset: (id: string | number) => del<{ status: string; id: string; deleted: boolean }>(`/datasets/${id}`),

  clearDatasets: () => post<{ status: string; message: string; deleted_count: number; files_purged: number }>('/datasets/clear'),
}


