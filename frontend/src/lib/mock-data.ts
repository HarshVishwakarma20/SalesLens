import type {
  AnomalyDay,
  CohortRow,
  Dataset,
  DatasetSummary,
  FunnelStep,
  JobRun,
  JourneyCustomer,
  MonthlyPoint,
  Product,
  QualityCheck,
  RfmCustomer,
  ReturnRow,
  RiskScore,
  SegmentName,
  RiskBand,
} from './types'

// ─── Deterministic LCG RNG ────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

// ─── Monthly Sales ────────────────────────────────────────────────────────────

const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec*']
const SALES_K = [510, 490, 450, 650, 560, 620, 640, 640, 660, 900, 950, 1330, 330]
const RETURNS_K = [28, 26, 24, 35, 30, 33, 35, 34, 36, 48, 52, 72, 18]

const monthly: MonthlyPoint[] = MONTHS.map((month, i) => ({
  month,
  sales: SALES_K[i],
  returns: RETURNS_K[i],
  returnRate: Number(((RETURNS_K[i] / SALES_K[i]) * 100).toFixed(2)),
  partial: i === MONTHS.length - 1,
}))

// ─── Daily Series (305 days) ──────────────────────────────────────────────────

const REAL_FLAGGED_DATES = new Set(['2010-12-19', '2011-01-11', '2011-01-18', '2011-03-24', '2011-03-29'])
const EXTRA_FLAG_IDX = new Set([45, 72, 98, 115, 133, 158, 177, 200, 219, 240, 267])

function buildDailySeries(): AnomalyDay[] {
  const rng = mkRng(42)
  const start = new Date(Date.UTC(2010, 11, 1))
  const days: AnomalyDay[] = []
  // generate raw sales first
  for (let i = 0; i < 305; i++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    const ds = date.toISOString().slice(0, 10)
    const seasonal = 18000 + i * 75 + Math.sin(i / 9) * 4200
    const holiday = i > 250 && i < 290 ? 14000 : 0
    const realFlag = REAL_FLAGGED_DATES.has(ds)
    const extraFlag = EXTRA_FLAG_IDX.has(i)
    const flagged = realFlag || extraFlag
    const spike = flagged ? (i % 3 === 0 ? -0.55 : 1.15) * seasonal : 0
    const sales = Math.max(4000, seasonal + holiday + (rng() - 0.5) * 6000 + spike)
    days.push({
      date: ds,
      sales: Math.round(sales),
      mean: 0,
      std: 0,
      zScore: 0,
      flagged,
      direction: null,
      affectedCustomers: [],
    })
  }
  // rolling mean + std (30-day window)
  const W = 30
  for (let i = 0; i < days.length; i++) {
    const start = Math.max(0, i - W)
    const window = days.slice(start, i + 1).map(d => d.sales)
    const mean = window.reduce((a, b) => a + b, 0) / window.length
    const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length) || 1
    const z = (days[i].sales - mean) / std
    days[i].mean = Math.round(mean)
    days[i].std = Math.round(std)
    days[i].zScore = Number(z.toFixed(2))
    if (days[i].flagged) {
      days[i].direction = z > 0 ? 'spike' : 'drop'
    }
  }
  // add affected customers for flagged days
  const custPool = ['13533', '15749', '18268', '15026', '12527', '13672', '16581', '14669', '14267', '13827']
  const rng2 = mkRng(99)
  for (const d of days) {
    if (d.flagged) {
      const n = 2 + Math.floor(rng2() * 5)
      const shuffled = [...custPool].sort(() => rng2() - 0.5)
      d.affectedCustomers = shuffled.slice(0, n)
    }
  }
  return days
}

export const DAILY_SERIES = buildDailySeries()

// ─── Risk Customers (top 10) ──────────────────────────────────────────────────

const TOP_RISK_RAW: Array<[string, SegmentName, number]> = [
  ['13533', 'At-Risk', 66.0],
  ['15749', 'At-Risk', 65.5],
  ['18268', 'Lost', 63.5],
  ['15026', 'At-Risk', 62.0],
  ['12527', 'At-Risk', 62.0],
  ['13672', 'Lost', 61.5],
  ['16581', 'Promising', 61.3],
  ['14669', 'At-Risk', 60.0],
  ['14267', 'Promising', 59.4],
  ['13827', 'Lost', 58.0],
]

function bandFor(score: number): RiskBand {
  if (score >= 60) return 'Critical'
  if (score >= 45) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

// ─── DEMO DATASET ─────────────────────────────────────────────────────────────

export const DEMO_DATASET: Dataset = {
  id: 'uci-demo',
  name: 'UCI Online Retail - Demo',
  customers: 4334,
  rows: 399659,
  dateRange: { from: '01 Dec 2010', to: '09 Dec 2011' },
  kpis: [
    { key: 'active', label: 'Active Customers', value: '3,362', tooltip: 'Customers whose segment is not Lost', delta: '+4.8%', trend: [3, 2, 4, 5, 3, 6, 7, 6, 8, 9, 8, 11], tone: 'accent' },
    { key: 'repeat', label: 'Repeat Rate', value: '65.27%', tooltip: 'Customers with 2+ orders', delta: '+1.2%', trend: [4, 5, 3, 6, 7, 6, 8, 7, 9, 8, 10, 10], tone: 'accent' },
    { key: 'churn', label: 'Churn Rate', value: '88.52%', badge: 'Indicative', tooltip: 'Based on one partial calendar month', note: 'Lost segment: 22.4%', trend: [9, 8, 10, 7, 8, 6, 7, 5, 4, 3, 4, 2], tone: 'warning' },
    { key: 'retention', label: 'Rev. Retention', value: '29.79%', tooltip: 'Average cohort revenue after month 0', note: 'Dec 10 - Dec 11', trend: [1, 8, 7, 6, 7, 5, 6, 7, 6, 8, 7, 8], tone: 'accent-2' },
    { key: 'net', label: 'Net Revenue', value: '8.27M', prefix: '£', tooltip: 'GBP 8,265,476.93', delta: '+14.2% YoY', trend: [2, 3, 1, 5, 4, 6, 7, 7, 8, 10, 11, 11], tone: 'positive' },
  ],
  monthly,
  segments: [
    { name: 'Champion', count: 897, share: 0.207 },
    { name: 'Loyal', count: 390, share: 0.090 },
    { name: 'Promising', count: 1078, share: 0.248 },
    { name: 'New', count: 234, share: 0.054 },
    { name: 'At-Risk', count: 763, share: 0.176 },
    { name: 'Lost', count: 972, share: 0.224 },
  ],
  daily: DAILY_SERIES,
  riskCustomers: TOP_RISK_RAW.map(([id, segment, score]) => ({
    id, segment, band: bandFor(score), score,
    rfmDecay: Number((score * 0.4 / 100).toFixed(3)),
    returnRate: Number((score * 0.25 / 100).toFixed(3)),
    gapTrend: Number((score * 0.2 / 100).toFixed(3)),
    anomaly: Number((score * 0.15 / 100).toFixed(3)),
    revenue: Math.round(score * 42),
    orders: 3 + Math.floor(score / 20),
    firstPurchase: '2010-12-15',
    lastPurchase: '2011-09-20',
    avgGap: Math.round(score * 0.9),
  })),
  leakage: { gross: 8_736_000, returns: 470_523, net: 8_265_476 },
}

// ─── Recent Datasets ──────────────────────────────────────────────────────────

export const RECENT_DATASETS: DatasetSummary[] = [
  { id: 'uci-demo', name: 'UCI Online Retail - Demo (Standard)', uploaded: 'Today, 09:41 AM', rows: 399659, status: 'Processed', primary: true },
  { id: 'uk-q3', name: 'UK Retail Store Q3 Export', uploaded: '18 Nov 2024', rows: 128400, status: 'Processed' },
  { id: 'fashion-2023', name: 'E-Commerce Fashion 2023 Cohort', uploaded: '02 Oct 2024', rows: 84912, status: 'Archived' },
]

export const CLEANED_COLUMNS = ['CustomerID', 'InvoiceNo', 'InvoiceDate', 'StockCode', 'NetRevenue']
export const RAW_COLUMNS = ['InvoiceNo', 'StockCode', 'Description', 'Quantity', 'InvoiceDate', 'UnitPrice', 'CustomerID', 'Country']
export const ANALYSIS_STEPS = ['Load', 'Validate', 'Customer Journey', 'RFM', 'Cohorts', 'Returns', 'Products', 'Anomalies', 'Risk Score', 'KPIs', 'Done']
export const CLEANING_STEPS = [
  'Read file', 'Check columns', 'Standardise types', 'Remove duplicates',
  'Remove missing CustomerID', 'Remove missing fields', 'Remove zero quantity',
  'Remove negative price', 'Remove non-product records', 'Classify sales vs returns',
  'Compute values', 'Save cleaned data',
]

// ─── RFM Customers (60 rows for Segments page) ────────────────────────────────

function segmentFor(r: number, f: number): SegmentName {
  if (r >= 4 && f >= 4) return 'Champion'
  if (r >= 3 && f >= 4) return 'Loyal'
  if (r >= 4 && f <= 2) return 'New'
  if (r <= 2 && f >= 3) return 'At-Risk'
  if (r <= 2 && f <= 2) return 'Lost'
  return 'Promising'
}

export const RFM_CUSTOMERS: RfmCustomer[] = (() => {
  const rng = mkRng(7)
  return Array.from({ length: 60 }, (_, i) => {
    const id = String(12000 + i * 47)
    const r = 1 + Math.floor(rng() * 5)
    const f = 1 + Math.floor(rng() * 5)
    const m = 1 + Math.floor(rng() * 5)
    const recency = Math.round(10 + rng() * 350)
    const frequency = Math.round(1 + rng() * 30)
    const monetary = Math.round(50 + rng() * 5000)
    const rfmScore = Number((0.4 * r + 0.3 * f + 0.3 * m).toFixed(2))
    return { id, recency, frequency, monetary, r, f, m, rfmScore, segment: segmentFor(r, f) }
  })
})()

// scatter points for RFM map (180 generated)
export const RFM_SCATTER = (() => {
  const rng = mkRng(13)
  return Array.from({ length: 180 }, (_, i) => {
    const r = 1 + Math.floor(rng() * 5)
    const f = 1 + Math.floor(rng() * 5)
    const m = 50 + Math.round(rng() * 5000)
    return { id: String(11000 + i * 31), recency: Math.round(10 + rng() * 350), frequency: Math.round(1 + rng() * 30), monetary: m, r, f, segment: segmentFor(r, f) }
  })
})()

// ─── Cohort Retention ─────────────────────────────────────────────────────────

export const COHORT_LABELS = [
  '2010-12', '2011-01', '2011-02', '2011-03', '2011-04',
  '2011-05', '2011-06', '2011-07', '2011-08', '2011-09',
  '2011-10', '2011-11', '2011-12',
]
const COHORT_SIZES = [885, 412, 308, 376, 264, 278, 301, 285, 168, 99, 87, 48, 23]

// Real retention values from the checklist (month 0=100)
const REAL_RETENTION: Record<string, number[]> = {
  '2010-12': [100, 36.5, 32.4, 38.3, 28.1, 26.0, 29.2, 24.5, 22.8, 20.1, 18.6, 17.3, 11.4],
  '2011-01': [100, 21.9, 26.7, 22.3, 19.8, 18.1, 16.5, 14.2, 12.9, 11.1, 9.8, 8.4],
  '2011-02': [100, 24.3, 21.1, 18.6, 16.5, 14.2, 12.8, 11.3, 9.7, 8.5, 7.2],
  '2011-03': [100, 27.1, 23.4, 19.7, 17.8, 15.3, 13.6, 11.8, 10.2, 8.9],
  '2011-04': [100, 22.7, 19.3, 16.8, 14.5, 12.6, 10.9, 9.4, 8.1],
  '2011-05': [100, 23.5, 20.1, 17.4, 15.0, 13.1, 11.5, 9.8],
  '2011-06': [100, 21.3, 18.7, 15.9, 13.7, 11.8, 10.2],
  '2011-07': [100, 20.8, 17.6, 14.9, 12.6, 10.7],
  '2011-08': [100, 19.4, 16.2, 13.5, 11.2],
  '2011-09': [100, 18.1, 14.8, 12.0],
  '2011-10': [100, 16.5, 13.2],
  '2011-11': [100, 14.0],
  '2011-12': [100],
}

export const COHORT_ROWS: CohortRow[] = COHORT_LABELS.map((label, i) => {
  const rng = mkRng(i * 17 + 5)
  const retention = REAL_RETENTION[label] ?? [100]
  const revenue = retention.map(v => Number((v * (0.7 + rng() * 0.9)).toFixed(1)))
  return { label, size: COHORT_SIZES[i], retention, revenue }
})

// ─── Returns Data ─────────────────────────────────────────────────────────────

// Returns-only SKUs (100% return rate)
const RETURNS_ONLY_SKUS = ['85126', '84839', '85023C', '85065']

export const RETURNS_BY_PRODUCT: ReturnRow[] = (() => {
  const rng = mkRng(55)
  const normal = Array.from({ length: 25 }, (_, i) => {
    const sales = Math.round(500 + rng() * 8000)
    const returns = Math.round(sales * (0.01 + rng() * 0.18))
    const returnRate = returns / sales
    return {
      key: `SKU-${String(20000 + i * 113).slice(0, 5)}`,
      sales, returns,
      returnRate: Number(returnRate.toFixed(4)),
      flagged: returnRate > 0.0512,
    }
  })
  const returnsOnly = RETURNS_ONLY_SKUS.map(k => ({
    key: k, sales: 0, returns: Math.round(200 + Math.random() * 800),
    returnRate: 1, flagged: true, salesOnly: false,
  }))
  return [...normal, ...returnsOnly]
})()

const SEG_NAMES: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']
export const RETURNS_BY_SEGMENT: ReturnRow[] = SEG_NAMES.map(seg => {
  const rng = mkRng(seg.charCodeAt(0))
  const sales = Math.round(30000 + rng() * 200000)
  const returns = Math.round(sales * (0.02 + rng() * 0.12))
  const returnRate = returns / sales
  return { key: seg, sales, returns, returnRate: Number(returnRate.toFixed(4)), flagged: returnRate > 0.0512 }
})

export const RETURNS_BY_MONTH: ReturnRow[] = MONTHS.map((m, i) => ({
  key: m,
  sales: SALES_K[i] * 1000,
  returns: RETURNS_K[i] * 1000,
  returnRate: Number((RETURNS_K[i] / SALES_K[i]).toFixed(4)),
  flagged: RETURNS_K[i] / SALES_K[i] > 0.0512,
}))

// ─── Products ─────────────────────────────────────────────────────────────────

const TOP_PRODUCTS_REAL: Product[] = [
  { code: '22423', name: 'REGENCY CAKESTAND 3 TIER', netRevenue: 132600, grossSold: 141000, returnedValue: 8400, returnRate: 0.060, attachRate: 0.48, buyers: 890 },
  { code: '85123A', name: 'WHITE HANGING HEART T-LIGHT HOLDER', netRevenue: 98400, grossSold: 104000, returnedValue: 5600, returnRate: 0.054, attachRate: 0.43, buyers: 720 },
  { code: '85099B', name: 'JUMBO BAG RED RETROSPOT', netRevenue: 87200, grossSold: 92000, returnedValue: 4800, returnRate: 0.052, attachRate: 0.38, buyers: 650 },
  { code: '47566', name: 'PARTY BUNTING', netRevenue: 76500, grossSold: 81000, returnedValue: 4500, returnRate: 0.056, attachRate: 0.35, buyers: 580 },
  { code: '84879', name: 'ASSORTED COLOUR BIRD ORNAMENT', netRevenue: 65300, grossSold: 69000, returnedValue: 3700, returnRate: 0.054, attachRate: 0.29, buyers: 510 },
  { code: '23084', name: 'RABBIT NIGHT LIGHT', netRevenue: 54100, grossSold: 57000, returnedValue: 2900, returnRate: 0.051, attachRate: 0.25, buyers: 430 },
  { code: '22502', name: 'PICNIC BASKET WICKER 60 PIECES', netRevenue: 48700, grossSold: 51500, returnedValue: 2800, returnRate: 0.054, attachRate: 0.22, buyers: 380 },
  { code: '79321', name: 'CHILLI LIGHTS', netRevenue: 43200, grossSold: 45800, returnedValue: 2600, returnRate: 0.057, attachRate: 0.20, buyers: 340 },
  { code: '22086', name: 'PAPER CHAIN KIT 50S CHRISTMAS', netRevenue: 38600, grossSold: 41000, returnedValue: 2400, returnRate: 0.059, attachRate: 0.18, buyers: 305 },
  { code: '21137', name: 'BLACK RECORD COVER FRAME', netRevenue: 34400, grossSold: 36500, returnedValue: 2100, returnRate: 0.058, attachRate: 0.16, buyers: 270 },
]

export const PRODUCTS: Product[] = (() => {
  const rng = mkRng(31)
  const generated = Array.from({ length: 50 }, (_, i) => {
    const net = Math.round(1000 + rng() * 30000)
    const gross = Math.round(net * (1 + rng() * 0.1))
    const ret = gross - net
    const returnRate = Number((ret / gross).toFixed(4))
    const attachRate = Number((0.03 + rng() * 0.45).toFixed(3))
    return {
      code: `GEN${String(30000 + i * 71).slice(0, 5)}`,
      name: `Product ${30000 + i * 71}`,
      netRevenue: net, grossSold: gross, returnedValue: ret,
      returnRate, attachRate, buyers: Math.round(20 + rng() * 400),
    } as Product
  })
  return [...TOP_PRODUCTS_REAL, ...generated]
})()

// ─── Risk Scores (300 generated) ──────────────────────────────────────────────

const SEG_AVG_REV: Record<SegmentName, number> = {
  Champion: 5200, Loyal: 2100, Promising: 1100, 'At-Risk': 900, New: 450, Lost: 380,
}

export const RISK_SCORES: RiskScore[] = (() => {
  const rng = mkRng(77)
  const segs: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']
  const segWeights = [0.207, 0.090, 0.248, 0.054, 0.176, 0.224]
  return Array.from({ length: 300 }, (_, i) => {
    const r = rng()
    let cum = 0, segIdx = 0
    for (let j = 0; j < segWeights.length; j++) { cum += segWeights[j]; if (r < cum) { segIdx = j; break } }
    const seg = segs[segIdx]
    const rfmDecay = Number((rng() * 0.9).toFixed(3))
    const ret = Number((rng() * 0.8).toFixed(3))
    const gap = Number((rng() * 0.7).toFixed(3))
    const anom = Number((rng() * 0.6).toFixed(3))
    const score = Number((100 * (0.4 * rfmDecay + 0.25 * ret + 0.2 * gap + 0.15 * anom)).toFixed(1))
    const band = bandFor(score)
    const revenue = Math.round(SEG_AVG_REV[seg] * (0.5 + rng()))
    const drivers = ['rfm_decay', 'return_rate', 'gap_trend', 'anomaly']
    const vals = [rfmDecay, ret, gap, anom]
    const maxIdx = vals.indexOf(Math.max(...vals))
    return {
      id: String(10000 + i * 37),
      segment: seg, band, score, rfmDecay, returnRate: ret, gapTrend: gap, anomaly: anom, revenue,
      mainDriver: drivers[maxIdx],
    }
  })
})()

// ─── Journey Customers (80 rows) ──────────────────────────────────────────────

const REAL_JOURNEY: JourneyCustomer[] = [
  { id: '12346', firstPurchase: '2010-12-02', lastPurchase: '2011-11-25', orders: 22, revenue: 4640, avgGap: 16, gapTrend: 'down', segment: 'Champion', band: 'Low', score: 18 },
  { id: '12347', firstPurchase: '2010-12-07', lastPurchase: '2011-10-14', orders: 9, revenue: 1820, avgGap: 37, gapTrend: 'flat', segment: 'Loyal', band: 'Medium', score: 31 },
  { id: '12348', firstPurchase: '2010-12-16', lastPurchase: '2011-09-03', orders: 5, revenue: 770, avgGap: 54, gapTrend: 'up', segment: 'Promising', band: 'Medium', score: 36 },
  { id: '12349', firstPurchase: '2011-01-10', lastPurchase: '2011-07-21', orders: 3, revenue: 420, avgGap: 66, gapTrend: 'up', segment: 'At-Risk', band: 'High', score: 51 },
  { id: '12350', firstPurchase: '2011-02-22', lastPurchase: '2011-03-18', orders: 1, revenue: 210, avgGap: null, gapTrend: 'flat', segment: 'Lost', band: 'High', score: 55 },
]

export const JOURNEY_CUSTOMERS: JourneyCustomer[] = (() => {
  const rng = mkRng(61)
  const segs: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']
  const generated = Array.from({ length: 75 }, (_, i) => {
    const seg = segs[Math.floor(rng() * segs.length)]
    const orders = 1 + Math.floor(rng() * 25)
    const revenue = Math.round(100 + rng() * 6000)
    const avgGap = orders > 1 ? Math.round(5 + rng() * 120) : null
    const gt = rng() > 0.6 ? 'up' : rng() > 0.5 ? 'down' : 'flat'
    const score = Math.round(5 + rng() * 70)
    const band = bandFor(score)
    return {
      id: String(20000 + i * 53),
      firstPurchase: `2011-0${1 + Math.floor(rng() * 9)}-${String(1 + Math.floor(rng() * 27)).padStart(2, '0')}`,
      lastPurchase: `2011-${String(8 + Math.floor(rng() * 4)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 27)).padStart(2, '0')}`,
      orders, revenue, avgGap, gapTrend: gt as 'up' | 'down' | 'flat', segment: seg, band, score,
    } as JourneyCustomer
  })
  return [...REAL_JOURNEY, ...generated]
})()

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const FUNNEL_STEPS: FunnelStep[] = [
  { label: 'Original rows', rows: 541909 },
  { label: 'After remove duplicates', rows: 536641, removed: 5268 },
  { label: 'After remove missing CustomerID', rows: 525461, removed: 11180 },
  { label: 'After remove missing essentials', rows: 519240, removed: 6221 },
  { label: 'After remove zero quantity', rows: 511920, removed: 7320 },
  { label: 'After remove negative price', rows: 408924, removed: 102996 },
  { label: 'After remove non-product rows', rows: 399659, removed: 9265 },
]

export const PIPELINE_SUMMARY = [
  { label: 'Original rows', value: '541,909' },
  { label: 'Duplicates removed', value: '5,268' },
  { label: 'Missing CustomerID', value: '11,180' },
  { label: 'Missing essentials', value: '6,221' },
  { label: 'Zero quantity rows', value: '7,320' },
  { label: 'Negative price rows', value: '102,996' },
  { label: 'Non-product rows', value: '9,265' },
  { label: 'Final clean rows', value: '399,659' },
  { label: 'Positive sales transactions', value: '391,153' },
  { label: 'Return transactions', value: '8,506' },
  { label: 'Gross sales value', value: '£8,736,000' },
  { label: 'Return value', value: '£470,523' },
  { label: 'Net revenue', value: '£8,265,476.93' },
]

export const QUALITY_CHECKS: QualityCheck[] = [
  { field: 'InvoiceNo', issues: 0, status: 'pass' },
  { field: 'StockCode', issues: 0, status: 'pass' },
  { field: 'CustomerID', issues: 0, status: 'pass' },
  { field: 'Quantity', issues: 0, status: 'pass' },
  { field: 'InvoiceDate', issues: 0, status: 'pass' },
  { field: 'UnitPrice', issues: 0, status: 'pass' },
  { field: 'Duplicate rows', issues: 0, status: 'pass' },
  { field: 'Zero quantity', issues: 0, status: 'pass' },
  { field: 'Negative UnitPrice', issues: 0, status: 'pass' },
]

export const JOB_HISTORY: JobRun[] = [
  { id: 'JOB-001', dataset: 'UCI Online Retail - Demo', started: 'Today, 09:41 AM', duration: '4.2s', status: 'complete' },
  { id: 'JOB-002', dataset: 'UK Retail Store Q3 Export', started: '18 Nov 2024, 11:20 AM', duration: '6.8s', status: 'complete' },
  { id: 'JOB-003', dataset: 'E-Commerce Fashion 2023 Cohort', started: '02 Oct 2024, 02:15 PM', duration: '5.1s', status: 'complete' },
  { id: 'JOB-004', dataset: 'Test Upload Raw Data', started: 'Today, 08:12 AM', duration: '—', status: 'failed' },
]

// ─── Journey histograms ────────────────────────────────────────────────────────

export const ORDERS_HIST = [
  { bucket: '1', count: 1505 },
  { bucket: '2', count: 780 },
  { bucket: '3', count: 520 },
  { bucket: '4', count: 360 },
  { bucket: '5+', count: 1169 },
]

export const GAP_HIST = (() => {
  const rng = mkRng(23)
  return Array.from({ length: 9 }, (_, i) => ({
    bucket: `${i * 20}-${(i + 1) * 20}`,
    count: Math.round(80 + rng() * 600 * (1 - i * 0.08)),
  }))
})()

export const ACQUIRED_PER_MONTH = COHORT_LABELS.map((label, i) => ({
  month: label.replace('2011-', '').replace('2010-', ''),
  acquired: COHORT_SIZES[i],
}))

export const REVENUE_CURVE = (() => {
  // Lorenz-like: top X% of customers = Y% revenue
  const pts = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const vals = [0, 2, 7, 28, 45, 57, 66, 74, 81, 87, 93, 100]
  return pts.map((x, i) => ({ pct: x, revenue: vals[i] }))
})()
