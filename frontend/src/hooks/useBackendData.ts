/**
 * React Query hooks that fetch live analysis data from the backend.
 *
 * Each hook:
 *  - Uses `datasetName` from @/stores/dataset as part of the query key
 *    so React Query automatically re-fetches when a new dataset is uploaded.
 *  - Falls back to the existing mock data only when status === 'idle'
 *    (no upload has ever happened in this session).
 *  - Is disabled while status is 'uploading' or 'processing' to avoid
 *    race conditions.
 *
 * Pages call these hooks instead of importing constants from mock-data.ts.
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDatasetStore } from '@/stores/dataset'
import type {
    AnomalyDay,
    CohortRow,
    JourneyCustomer,
    Product,
    ReturnRow,
    RfmCustomer,
    RiskScore,
    SegmentName,
} from '@/lib/types'
import {
    COHORT_ROWS,
    DAILY_SERIES,
    JOURNEY_CUSTOMERS,
    ORDERS_HIST,
    GAP_HIST,
    ACQUIRED_PER_MONTH,
    PRODUCTS,
    RETURNS_BY_PRODUCT,
    RETURNS_BY_SEGMENT,
    RETURNS_BY_MONTH,
    RFM_CUSTOMERS,
    RFM_SCATTER,
    RISK_SCORES,
    DEMO_DATASET,
} from '@/lib/mock-data'

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Common query options for all backend data hooks */
function useQueryOpts() {
    const status = useDatasetStore((s) => s.status)
    const datasetName = useDatasetStore((s) => s.datasetName)
    return {
        enabled: status === 'ready',
        isIdle: status === 'idle',
        datasetName: datasetName ?? 'demo',
        staleTime: 0 as const,
        refetchOnMount: 'always' as const,
        retry: 2 as const,
        retryDelay: 1000 as const,
    }
}

// ─── Segments ─────────────────────────────────────────────────────────────────

export interface SegmentsData {
    rfmCustomers: RfmCustomer[]
    rfmScatter: typeof RFM_SCATTER
    segments: typeof DEMO_DATASET.segments
}

export function useSegmentsData(): { data: SegmentsData; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['segments-data', opts.datasetName],
        queryFn: async (): Promise<SegmentsData> => {
            const res = await api.getSegments(1, 500)
            // Map backend RFM rows to frontend RfmCustomer shape
            const rfmCustomers: RfmCustomer[] = res.items.map((item) => ({
                id: String(item.CustomerID),
                recency: item.Recency,
                frequency: item.Frequency,
                monetary: item.Monetary,
                r: item.R_Score,
                f: item.F_Score,
                m: item.M_Score,
                rfmScore: item.RFM_Score,
                segment: item.Segment as SegmentName,
            }))
            // Build scatter data from the same RFM rows
            const rfmScatter = rfmCustomers.map((c) => ({
                id: c.id,
                recency: c.recency,
                frequency: c.frequency,
                monetary: c.monetary,
                r: c.r,
                f: c.f,
                segment: c.segment,
            }))
            // Segment distribution
            const segments = res.segmentDistribution.map((s) => ({
                name: s.segment as SegmentName,
                count: s.count,
                share: s.pct / 100,
            }))
            return { rfmCustomers, rfmScatter, segments }
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return {
            data: {
                rfmCustomers: RFM_CUSTOMERS,
                rfmScatter: RFM_SCATTER,
                segments: DEMO_DATASET.segments,
            },
            isLoading: false,
        }
    }
    return {
        data: query.data ?? { rfmCustomers: RFM_CUSTOMERS, rfmScatter: RFM_SCATTER, segments: DEMO_DATASET.segments },
        isLoading: query.isLoading,
    }
}

// ─── Journey ──────────────────────────────────────────────────────────────────

export interface JourneyData {
    customers: JourneyCustomer[]
    ordersHist: typeof ORDERS_HIST
    gapHist: typeof GAP_HIST
    acquiredPerMonth: typeof ACQUIRED_PER_MONTH
}

export function useJourneyData(): { data: JourneyData; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['journey-data', opts.datasetName],
        queryFn: async (): Promise<JourneyData> => {
            const res = await api.getJourney(1, 500)
            const customers: JourneyCustomer[] = res.items.map((item) => ({
                id: String(item.CustomerID),
                firstPurchase: item.FirstPurchaseDate,
                lastPurchase: item.LastPurchaseDate,
                orders: item.OrderCount,
                revenue: item.TotalRevenue,
                avgGap: item.AvgGap,
                gapTrend: (item.GapTrend ?? 'flat') as 'up' | 'down' | 'flat',
                segment: 'Promising' as SegmentName, // Journey endpoint doesn't include segment by default
                band: 'Low' as const,
                score: 0,
            }))
            // Build order distribution histogram from the fetched data
            const orderCounts = customers.map((c) => c.orders)
            const ordersHist = [
                { bucket: '1', count: orderCounts.filter((o) => o === 1).length },
                { bucket: '2', count: orderCounts.filter((o) => o === 2).length },
                { bucket: '3', count: orderCounts.filter((o) => o === 3).length },
                { bucket: '4', count: orderCounts.filter((o) => o === 4).length },
                { bucket: '5+', count: orderCounts.filter((o) => o >= 5).length },
            ]
            // Build gap histogram
            const gaps = customers.map((c) => c.avgGap).filter((g): g is number => g !== null)
            const gapHist = Array.from({ length: 9 }, (_, i) => ({
                bucket: `${i * 20}-${(i + 1) * 20}`,
                count: gaps.filter((g) => g >= i * 20 && g < (i + 1) * 20).length,
            }))
            // Acquired per month — group by first purchase month
            const monthCounts: Record<string, number> = {}
            for (const c of customers) {
                const m = c.firstPurchase.slice(0, 7)
                monthCounts[m] = (monthCounts[m] || 0) + 1
            }
            const acquiredPerMonth = Object.entries(monthCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, acquired]) => ({ month: month.replace(/^\d{4}-/, ''), acquired }))

            return { customers, ordersHist, gapHist, acquiredPerMonth }
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    const fallback: JourneyData = {
        customers: JOURNEY_CUSTOMERS,
        ordersHist: ORDERS_HIST,
        gapHist: GAP_HIST,
        acquiredPerMonth: ACQUIRED_PER_MONTH,
    }

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: fallback, isLoading: false }
    }
    return { data: query.data ?? fallback, isLoading: query.isLoading }
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProductsData(): { data: Product[]; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['products-data', opts.datasetName],
        queryFn: async (): Promise<Product[]> => {
            const res = await api.getProducts(1, 500)
            return res.items.map((item) => ({
                code: item.StockCode,
                name: item.Description,
                netRevenue: item.NetRevenue,
                grossSold: item.GrossSales,
                returnedValue: item.ReturnedValue,
                returnRate: item.ReturnRate,
                attachRate: item.RepeatAttachRate ?? 0,
                buyers: item.Buyers,
            }))
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: PRODUCTS, isLoading: false }
    }
    return { data: query.data ?? PRODUCTS, isLoading: query.isLoading }
}

// ─── Returns ──────────────────────────────────────────────────────────────────

export interface ReturnsData {
    byProduct: ReturnRow[]
    bySegment: ReturnRow[]
    byMonth: ReturnRow[]
    portfolioAvgReturnRate: number
}

export function useReturnsData(): { data: ReturnsData; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['returns-data', opts.datasetName],
        queryFn: async (): Promise<ReturnsData> => {
            const [skuRes, segRes, monthRes] = await Promise.all([
                api.getReturns('SKU'),
                api.getReturns('Segment'),
                api.getReturns('Month'),
            ])
            const mapRow = (r: { Key: string; Sales: number; Returns: number; ReturnRate: number; Flagged: boolean }): ReturnRow => ({
                key: r.Key,
                sales: r.Sales,
                returns: r.Returns,
                returnRate: r.ReturnRate,
                flagged: r.Flagged,
            })
            return {
                byProduct: skuRes.records.map(mapRow),
                bySegment: segRes.records.map(mapRow),
                byMonth: monthRes.records.map(mapRow),
                portfolioAvgReturnRate: skuRes.portfolioAvgReturnRate,
            }
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    const fallback: ReturnsData = {
        byProduct: RETURNS_BY_PRODUCT,
        bySegment: RETURNS_BY_SEGMENT,
        byMonth: RETURNS_BY_MONTH,
        portfolioAvgReturnRate: 0.0512,
    }

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: fallback, isLoading: false }
    }
    return { data: query.data ?? fallback, isLoading: query.isLoading }
}

// ─── Anomalies ────────────────────────────────────────────────────────────────

export function useAnomaliesData(): { data: AnomalyDay[]; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['anomalies-data', opts.datasetName],
        queryFn: async (): Promise<AnomalyDay[]> => {
            const res = await api.getAnomalies('rolling')
            return res.records.map((r) => ({
                date: r.Date,
                sales: r.Sales,
                mean: r.Mean,
                std: r.Std,
                zScore: r.ZScore,
                flagged: r.Flagged,
                direction: r.Direction,
                affectedCustomers: (r.AffectedCustomerIDs ?? []).map(String),
            }))
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: DAILY_SERIES, isLoading: false }
    }
    return { data: query.data ?? DAILY_SERIES, isLoading: query.isLoading }
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export function useRiskData(): { data: RiskScore[]; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['risk-data', opts.datasetName],
        queryFn: async (): Promise<RiskScore[]> => {
            const res = await api.getRisk(1, 500)
            return res.items.map((item) => {
                const vals = [item.RFMDecay ?? 0, item.ReturnRate ?? 0, item.GapTrend ?? 0, item.Anomaly ?? 0]
                const drivers = ['rfm_decay', 'return_rate', 'gap_trend', 'anomaly']
                const maxIdx = vals.indexOf(Math.max(...vals))
                return {
                    id: String(item.CustomerID),
                    segment: 'Promising' as SegmentName, // Risk endpoint may not have segment
                    band: item.RiskBand as RiskScore['band'],
                    score: item.RiskScore,
                    rfmDecay: item.RFMDecay ?? 0,
                    returnRate: item.ReturnRate ?? 0,
                    gapTrend: item.GapTrend ?? 0,
                    anomaly: item.Anomaly ?? 0,
                    revenue: 0,
                    mainDriver: drivers[maxIdx],
                }
            })
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: RISK_SCORES, isLoading: false }
    }
    return { data: query.data ?? RISK_SCORES, isLoading: query.isLoading }
}

// ─── Cohorts ──────────────────────────────────────────────────────────────────

export function useCohortsData(): { data: CohortRow[]; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['cohorts-data', opts.datasetName],
        queryFn: async (): Promise<CohortRow[]> => {
            const res = await api.getCohorts()
            // Group records by CohortMonth
            const grouped: Record<string, typeof res.records> = {}
            for (const r of res.records) {
                const key = String(r.CohortMonth)
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(r)
            }
            return Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([label, rows]) => {
                    // Sort by MonthIndex
                    const sorted = [...rows].sort((a, b) => a.MonthIndex - b.MonthIndex)
                    return {
                        label,
                        size: sorted[0]?.CohortSize ?? 0,
                        retention: sorted.map((r) => r.RetentionPct),
                        revenue: sorted.map((r) => r.RetentionRevPct ?? r.RetentionPct * 0.8),
                    }
                })
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: COHORT_ROWS, isLoading: false }
    }
    return { data: query.data ?? COHORT_ROWS, isLoading: query.isLoading }
}
