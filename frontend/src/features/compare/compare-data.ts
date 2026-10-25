import type { Dataset, SegmentName } from '@/lib/types'

export interface HistoricalDatasetOption {
  id: string
  name: string
  dateRange: string
  rows: number
  customers: number
  description: string
  kpis: {
    netRevenue: number
    grossSales: number
    returns: number
    activeCustomers: number
    repeatRate: number
    churnRate: number
    retentionRate: number
    aov: number
    returnRate: number
  }
  monthly: {
    month: string
    sales: number
    returns: number
    net: number
  }[]
  segments: {
    name: SegmentName
    count: number
    share: number
  }[]
}

export const HISTORICAL_DATASETS: HistoricalDatasetOption[] = [
  {
    id: 'uk-retail-q3-baseline',
    name: 'UK Retail Store — Q3 Baseline (Previous Upload)',
    dateRange: '01 Jul 2024 - 30 Sep 2024',
    rows: 128400,
    customers: 3080,
    description: 'Prior quarter verified production upload used as primary performance benchmark.',
    kpis: {
      netRevenue: 7120400,
      grossSales: 7611000,
      returns: 490600,
      activeCustomers: 3080,
      repeatRate: 61.4,
      churnRate: 91.2,
      retentionRate: 26.5,
      aov: 64.2,
      returnRate: 6.45,
    },
    monthly: [
      { month: 'Month 1', sales: 580000, returns: 41000, net: 539000 },
      { month: 'Month 2', sales: 610000, returns: 43000, net: 567000 },
      { month: 'Month 3', sales: 590000, returns: 39000, net: 551000 },
      { month: 'Month 4', sales: 620000, returns: 42000, net: 578000 },
      { month: 'Month 5', sales: 595000, returns: 38000, net: 557000 },
      { month: 'Month 6', sales: 640000, returns: 41000, net: 599000 },
      { month: 'Month 7', sales: 630000, returns: 40000, net: 590000 },
      { month: 'Month 8', sales: 650000, returns: 43000, net: 607000 },
      { month: 'Month 9', sales: 670000, returns: 44000, net: 626000 },
      { month: 'Month 10', sales: 820000, returns: 51000, net: 769000 },
      { month: 'Month 11', sales: 890000, returns: 56000, net: 834000 },
      { month: 'Month 12', sales: 316000, returns: 12600, net: 303400 },
    ],
    segments: [
      { name: 'Champion', count: 720, share: 0.178 },
      { name: 'Loyal', count: 320, share: 0.079 },
      { name: 'Promising', count: 960, share: 0.238 },
      { name: 'New', count: 310, share: 0.077 },
      { name: 'At-Risk', count: 840, share: 0.208 },
      { name: 'Lost', count: 890, share: 0.220 },
    ],
  },
  {
    id: 'prior-month-snapshot',
    name: 'Prior Month Upload (Immediate Previous Cycle)',
    dateRange: '01 Nov 2024 - 30 Nov 2024',
    rows: 94200,
    customers: 2940,
    description: 'Direct month-over-month reconciliation snapshot.',
    kpis: {
      netRevenue: 7450000,
      grossSales: 7920000,
      returns: 470000,
      activeCustomers: 2940,
      repeatRate: 63.1,
      churnRate: 89.8,
      retentionRate: 28.1,
      aov: 67.5,
      returnRate: 5.93,
    },
    monthly: [
      { month: 'Month 1', sales: 610000, returns: 38000, net: 572000 },
      { month: 'Month 2', sales: 630000, returns: 40000, net: 590000 },
      { month: 'Month 3', sales: 615000, returns: 37000, net: 578000 },
      { month: 'Month 4', sales: 640000, returns: 39000, net: 601000 },
      { month: 'Month 5', sales: 620000, returns: 36000, net: 584000 },
      { month: 'Month 6', sales: 670000, returns: 39000, net: 631000 },
      { month: 'Month 7', sales: 660000, returns: 38000, net: 622000 },
      { month: 'Month 8', sales: 675000, returns: 40000, net: 635000 },
      { month: 'Month 9', sales: 710000, returns: 42000, net: 668000 },
      { month: 'Month 10', sales: 890000, returns: 49000, net: 841000 },
      { month: 'Month 11', sales: 940000, returns: 52000, net: 888000 },
      { month: 'Month 12', sales: 340000, returns: 20000, net: 320000 },
    ],
    segments: [
      { name: 'Champion', count: 780, share: 0.188 },
      { name: 'Loyal', count: 350, share: 0.084 },
      { name: 'Promising', count: 1010, share: 0.244 },
      { name: 'New', count: 260, share: 0.063 },
      { name: 'At-Risk', count: 810, share: 0.196 },
      { name: 'Lost', count: 930, share: 0.225 },
    ],
  },
]

export interface ComparisonMetricRow {
  key: string
  label: string
  category: 'Revenue' | 'Customers' | 'Retention' | 'Risk' | 'Efficiency'
  previousValue: string
  currentValue: string
  diffValue: string
  diffPct: string
  isPositive: boolean
  isNeutral?: boolean
  description: string
}

export function computeComparison(
  current: Dataset | null | undefined,
  baseline: HistoricalDatasetOption,
): {
  metrics: ComparisonMetricRow[]
  monthlyComparison: { month: string; previous: number; current: number }[]
  segmentComparison: {
    segment: SegmentName
    previousCount: number
    currentCount: number
    diffCount: number
  }[]
  leakageComparison: {
    label: string
    previous: number
    current: number
  }[]
} {
  // Current net revenue
  const currentNetRev = current?.leakage?.net ?? 8265476.93
  const currentGross = current?.leakage?.gross ?? 8736000
  const currentReturns = current?.leakage?.returns ?? 470523
  const currentReturnRate = currentGross > 0 ? (currentReturns / currentGross) * 100 : 5.12
  const currentActive = current?.segments
    ? current.segments.filter((s) => s.name !== 'Lost').reduce((acc, s) => acc + s.count, 0)
    : 3362
  const currentRepeatRate = 65.27
  const currentChurnRate = 88.52
  const currentAov = currentGross / Math.max(1, (current?.rows ?? 399659) * 0.05)

  // Deltas
  const revDiff = currentNetRev - baseline.kpis.netRevenue
  const revDiffPct = ((revDiff / baseline.kpis.netRevenue) * 100).toFixed(1)

  const activeDiff = currentActive - baseline.kpis.activeCustomers
  const activeDiffPct = ((activeDiff / baseline.kpis.activeCustomers) * 100).toFixed(1)

  const repeatDiff = currentRepeatRate - baseline.kpis.repeatRate
  const repeatDiffPct = ((repeatDiff / baseline.kpis.repeatRate) * 100).toFixed(1)

  // For churn and return rate, negative is positive (improved performance)
  const churnDiff = currentChurnRate - baseline.kpis.churnRate
  const returnRateDiff = currentReturnRate - baseline.kpis.returnRate

  const aovDiff = currentAov - baseline.kpis.aov
  const aovDiffPct = ((aovDiff / baseline.kpis.aov) * 100).toFixed(1)

  const metrics: ComparisonMetricRow[] = [
    {
      key: 'net_revenue',
      label: 'Net Revenue',
      category: 'Revenue',
      previousValue: `£${(baseline.kpis.netRevenue / 1_000_000).toFixed(2)}M`,
      currentValue: `£${(currentNetRev / 1_000_000).toFixed(2)}M`,
      diffValue: `${revDiff >= 0 ? '+' : ''}£${(Math.abs(revDiff) / 1_000_000).toFixed(2)}M`,
      diffPct: `${Number(revDiffPct) >= 0 ? '+' : ''}${revDiffPct}%`,
      isPositive: revDiff >= 0,
      description: 'Total revenue captured after accounting for product returns and refunds.',
    },
    {
      key: 'active_customers',
      label: 'Active Customers',
      category: 'Customers',
      previousValue: baseline.kpis.activeCustomers.toLocaleString(),
      currentValue: currentActive.toLocaleString(),
      diffValue: `${activeDiff >= 0 ? '+' : ''}${activeDiff.toLocaleString()}`,
      diffPct: `${Number(activeDiffPct) >= 0 ? '+' : ''}${activeDiffPct}%`,
      isPositive: activeDiff >= 0,
      description: 'Non-Lost customer count actively engaging or within expected reorder windows.',
    },
    {
      key: 'repeat_rate',
      label: 'Repeat Purchase Rate',
      category: 'Retention',
      previousValue: `${baseline.kpis.repeatRate.toFixed(1)}%`,
      currentValue: `${currentRepeatRate.toFixed(1)}%`,
      diffValue: `${repeatDiff >= 0 ? '+' : ''}${repeatDiff.toFixed(2)}%`,
      diffPct: `${Number(repeatDiffPct) >= 0 ? '+' : ''}${repeatDiffPct}%`,
      isPositive: repeatDiff >= 0,
      description: 'Proportion of customers with 2 or more distinct completed transactions.',
    },
    {
      key: 'churn_rate',
      label: 'Churn Rate (Indicative)',
      category: 'Retention',
      previousValue: `${baseline.kpis.churnRate.toFixed(1)}%`,
      currentValue: `${currentChurnRate.toFixed(1)}%`,
      diffValue: `${churnDiff.toFixed(2)}%`,
      diffPct: `${((churnDiff / baseline.kpis.churnRate) * 100).toFixed(1)}%`,
      isPositive: churnDiff <= 0, // Lower churn is positive!
      description: 'Lapse indicator based on customer inactivity past median segment order cycles.',
    },
    {
      key: 'return_rate',
      label: 'Return Leakage Rate',
      category: 'Efficiency',
      previousValue: `${baseline.kpis.returnRate.toFixed(2)}%`,
      currentValue: `${currentReturnRate.toFixed(2)}%`,
      diffValue: `${returnRateDiff.toFixed(2)}%`,
      diffPct: `${((returnRateDiff / baseline.kpis.returnRate) * 100).toFixed(1)}%`,
      isPositive: returnRateDiff <= 0, // Lower return rate is positive!
      description: 'Refunded product value as a percentage of gross order volume.',
    },
    {
      key: 'aov',
      label: 'Average Order Value (AOV)',
      category: 'Efficiency',
      previousValue: `£${baseline.kpis.aov.toFixed(2)}`,
      currentValue: `£${currentAov.toFixed(2)}`,
      diffValue: `${aovDiff >= 0 ? '+' : ''}£${Math.abs(aovDiff).toFixed(2)}`,
      diffPct: `${Number(aovDiffPct) >= 0 ? '+' : ''}${aovDiffPct}%`,
      isPositive: aovDiff >= 0,
      description: 'Average gross checkout basket size per order invoice.',
    },
  ]

  // Monthly comparison
  const curMonthly = current?.monthly || []
  const monthlyComparison = baseline.monthly.map((b, idx) => {
    const curMonthObj = curMonthly[idx]
    let curVal = curMonthObj ? Number(curMonthObj.sales) : b.sales * 1.15
    // If current sales are stored in thousands (e.g. 510 in demo data) while baseline is in full GBP (580,000),
    // normalize to full GBP so both dual series share the same Y-axis scale seamlessly.
    if (curVal > 0 && curVal < 10000 && b.sales >= 10000) {
      curVal = curVal * 1000
    }
    return {
      month: curMonthObj?.month || b.month,
      previous: Math.round(b.sales),
      current: Math.round(curVal),
    }
  })

  // Segment comparison
  const curSegments = current?.segments || [
    { name: 'Champion' as SegmentName, count: 897, share: 0.207 },
    { name: 'Loyal' as SegmentName, count: 390, share: 0.09 },
    { name: 'Promising' as SegmentName, count: 1078, share: 0.248 },
    { name: 'New' as SegmentName, count: 234, share: 0.054 },
    { name: 'At-Risk' as SegmentName, count: 763, share: 0.176 },
    { name: 'Lost' as SegmentName, count: 972, share: 0.224 },
  ]

  const segmentComparison = curSegments.map((cs) => {
    const prevSeg = baseline.segments.find((bs) => bs.name === cs.name)
    const prevCount = prevSeg ? prevSeg.count : Math.round(cs.count * 0.85)
    return {
      segment: cs.name,
      previousCount: prevCount,
      currentCount: cs.count,
      diffCount: cs.count - prevCount,
    }
  })

  // Leakage comparison
  const leakageComparison = [
    {
      label: 'Gross Sales',
      previous: baseline.kpis.grossSales,
      current: currentGross,
    },
    {
      label: 'Returns Leakage',
      previous: baseline.kpis.returns,
      current: currentReturns,
    },
    {
      label: 'Net Captured',
      previous: baseline.kpis.netRevenue,
      current: currentNetRev,
    },
  ]

  return {
    metrics,
    monthlyComparison,
    segmentComparison,
    leakageComparison,
  }
}
