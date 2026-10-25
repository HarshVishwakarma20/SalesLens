/**
 * React Query hooks that fetch live analysis data from the backend.
 *
 * Each hook:
 *  - Uses `datasetName` from @/stores/dataset as part of the query key
 *    so React Query automatically re-fetches when a new dataset is uploaded.
 *  - When status is 'idle' or before any file is uploaded, returns empty
 *    collections so no dummy/mock data is displayed.
 *  - Is disabled while status is 'uploading' or 'processing' to avoid
 *    race conditions.
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Common query options for all backend data hooks */
function useQueryOpts() {
    const status = useDatasetStore((s) => s.status)
    const datasetName = useDatasetStore((s) => s.datasetName)
    return {
        enabled: status === 'ready' && Boolean(datasetName),
        isIdle: status === 'idle' || !datasetName,
        datasetName: datasetName ?? '',
        staleTime: 0 as const,
        refetchOnMount: 'always' as const,
        retry: 2 as const,
        retryDelay: 1000 as const,
    }
}

// ─── Segments ─────────────────────────────────────────────────────────────────

export interface SegmentsData {
    rfmCustomers: RfmCustomer[]
    rfmScatter: { id: string; recency: number; frequency: number; monetary: number; r: number; f: number; segment: SegmentName }[]
    segments: { name: SegmentName; count: number; share: number }[]
}

const EMPTY_SEGMENTS: SegmentsData = {
    rfmCustomers: [],
    rfmScatter: [],
    segments: [],
}

export function useSegmentsData(): { data: SegmentsData; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['segments-data', opts.datasetName],
        queryFn: async (): Promise<SegmentsData> => {
            const res = await api.getSegments(1, 500)
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
            const rfmScatter = rfmCustomers.map((c) => ({
                id: c.id,
                recency: c.recency,
                frequency: c.frequency,
                monetary: c.monetary,
                r: c.r,
                f: c.f,
                segment: c.segment,
            }))
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
        return { data: EMPTY_SEGMENTS, isLoading: false }
    }
    return {
        data: query.data ?? EMPTY_SEGMENTS,
        isLoading: query.isLoading,
    }
}

// ─── Journey ──────────────────────────────────────────────────────────────────

export interface JourneyData {
    customers: JourneyCustomer[]
    ordersHist: { orders: string; count: number }[]
    gapHist: { gap: string; count: number }[]
    acquiredPerMonth: { month: string; acquired: number }[]
}

const EMPTY_JOURNEY: JourneyData = {
    customers: [],
    ordersHist: [],
    gapHist: [],
    acquiredPerMonth: [],
}

export function useJourneyData(): { data: JourneyData; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['journey-data', opts.datasetName],
        queryFn: async (): Promise<JourneyData> => {
            const res = await api.getJourney(1, 500)
            const customers: JourneyCustomer[] = res.items.map((item) => ({
                id: String(item.CustomerID),
                firstPurchase: item.FirstPurchaseDate ?? '',
                lastPurchase: item.LastPurchaseDate ?? '',
                orders: item.OrderCount ?? 0,
                revenue: item.TotalRevenue ?? 0,
                avgGap: item.AvgGap ?? 0,
                gapTrend: item.GapTrend ?? 'flat',
                segment: 'Promising' as SegmentName,
                band: 'Medium',
                score: 30,
            }))

            // Build histogram buckets
            const orderCounts: Record<string, number> = { '1': 0, '2-3': 0, '4-6': 0, '7-10': 0, '11+': 0 }
            for (const c of customers) {
                if (c.orders === 1) orderCounts['1']++
                else if (c.orders <= 3) orderCounts['2-3']++
                else if (c.orders <= 6) orderCounts['4-6']++
                else if (c.orders <= 10) orderCounts['7-10']++
                else orderCounts['11+']++
            }
            const ordersHist = Object.entries(orderCounts).map(([orders, count]) => ({ orders, count }))

            const gapCounts: Record<string, number> = { '<15d': 0, '15-30d': 0, '31-60d': 0, '61-90d': 0, '90d+': 0 }
            for (const c of customers) {
                const g = c.avgGap ?? 0
                if (g < 15) gapCounts['<15d']++
                else if (g <= 30) gapCounts['15-30d']++
                else if (g <= 60) gapCounts['31-60d']++
                else if (g <= 90) gapCounts['61-90d']++
                else gapCounts['90d+']++
            }
            const gapHist = Object.entries(gapCounts).map(([gap, count]) => ({ gap, count }))

            const monthCounts: Record<string, number> = {}
            for (const c of customers) {
                if (!c.firstPurchase) continue
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

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: EMPTY_JOURNEY, isLoading: false }
    }
    return { data: query.data ?? EMPTY_JOURNEY, isLoading: query.isLoading }
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
        return { data: [], isLoading: false }
    }
    return { data: query.data ?? [], isLoading: query.isLoading }
}

// ─── Returns ──────────────────────────────────────────────────────────────────

export interface ReturnsData {
    byProduct: ReturnRow[]
    bySegment: ReturnRow[]
    byMonth: ReturnRow[]
    portfolioAvgReturnRate: number
}

const EMPTY_RETURNS: ReturnsData = {
    byProduct: [],
    bySegment: [],
    byMonth: [],
    portfolioAvgReturnRate: 0,
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
                byProduct: (skuRes.records ?? []).map(mapRow),
                bySegment: (segRes.records ?? []).map(mapRow),
                byMonth: (monthRes.records ?? []).map(mapRow),
                portfolioAvgReturnRate: skuRes.portfolioAvgReturnRate ?? 0,
            }
        },
        enabled: opts.enabled,
        staleTime: opts.staleTime,
        refetchOnMount: opts.refetchOnMount,
        retry: opts.retry,
        retryDelay: opts.retryDelay,
    })

    if (opts.isIdle || (!query.data && !query.isLoading)) {
        return { data: EMPTY_RETURNS, isLoading: false }
    }
    return { data: query.data ?? EMPTY_RETURNS, isLoading: query.isLoading }
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
        return { data: [], isLoading: false }
    }
    return { data: query.data ?? [], isLoading: query.isLoading }
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
                    segment: 'Promising' as SegmentName,
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
        return { data: [], isLoading: false }
    }
    return { data: query.data ?? [], isLoading: query.isLoading }
}

// ─── Cohorts ──────────────────────────────────────────────────────────────────

export function useCohortsData(): { data: CohortRow[]; isLoading: boolean } {
    const opts = useQueryOpts()

    const query = useQuery({
        queryKey: ['cohorts-data', opts.datasetName],
        queryFn: async (): Promise<CohortRow[]> => {
            const res = await api.getCohorts()
            const grouped: Record<string, typeof res.records> = {}
            for (const r of res.records) {
                const key = String(r.CohortMonth)
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(r)
            }
            return Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([label, rows]) => {
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
        return { data: [], isLoading: false }
    }
    return { data: query.data ?? [], isLoading: query.isLoading }
}
