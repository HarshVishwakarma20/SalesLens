import { createContext, useContext, useState, type ReactNode } from 'react'
import type { RiskCustomer, SegmentName, RiskBand } from '@/lib/types'
import { DEMO_DATASET } from '@/lib/mock-data'

interface CustomerDrawerCtx {
    open: boolean
    customerId: string | null
    openDrawer: (id: string) => void
    closeDrawer: () => void
}

const Ctx = createContext<CustomerDrawerCtx | null>(null)

export function CustomerDrawerProvider({ children }: { children: ReactNode }) {
    const [customerId, setCustomerId] = useState<string | null>(null)

    const openDrawer = (id: string) => setCustomerId(id)
    const closeDrawer = () => setCustomerId(null)

    return (
        <Ctx.Provider value={{ open: customerId !== null, customerId, openDrawer, closeDrawer }}>
            {children}
            {customerId && <CustomerDrawer id={customerId} onClose={closeDrawer} />}
        </Ctx.Provider>
    )
}

export function useCustomerDrawer() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useCustomerDrawer used outside CustomerDrawerProvider')
    return ctx
}

// ─── Drawer component ─────────────────────────────────────────────────────────

import { X, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { RiskBadge } from '@/components/ui/risk-badge'
import { SegmentChip } from '@/components/ui/segment-chip'
import { RISK_COLOURS } from '@/lib/colours'
import { formatGBP } from '@/lib/formatters'

function getCustomerData(id: string): RiskCustomer {
    const found = DEMO_DATASET.riskCustomers.find(c => c.id === id)
    if (found) return found
    // generate plausible data for unknown IDs
    let seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const segs: SegmentName[] = ['Champion', 'Loyal', 'Promising', 'New', 'At-Risk', 'Lost']
    const segment = segs[Math.floor(rng() * segs.length)]
    const score = Number((20 + rng() * 60).toFixed(1))
    const band: RiskBand = score >= 60 ? 'Critical' : score >= 45 ? 'High' : score >= 25 ? 'Medium' : 'Low'
    return {
        id, segment, band, score,
        rfmDecay: Number((rng() * 0.8).toFixed(3)),
        returnRate: Number((rng() * 0.6).toFixed(3)),
        gapTrend: Number((rng() * 0.7).toFixed(3)),
        anomaly: Number((rng() * 0.5).toFixed(3)),
        revenue: Math.round(200 + rng() * 5000),
        orders: 1 + Math.floor(rng() * 20),
        firstPurchase: '2010-12-15',
        lastPurchase: '2011-08-20',
        avgGap: Math.round(10 + rng() * 60),
    }
}

function Gauge({ score, band }: { score: number; band: RiskBand }) {
    const color = RISK_COLOURS[band]
    const r = 40
    const circ = Math.PI * r
    const dash = (score / 100) * circ
    return (
        <svg width="100" height="60" viewBox="0 0 100 60" aria-label={`Risk score ${score}`}>
            <path d={`M10,50 A${r},${r} 0 0,1 90,50`} fill="none" stroke="var(--raised)" strokeWidth="8" />
            <path d={`M10,50 A${r},${r} 0 0,1 90,50`} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
            <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill={color} fontFamily="var(--font-mono)">
                {score.toFixed(1)}
            </text>
        </svg>
    )
}

function GapTrendIcon({ trend }: { trend: number }) {
    if (trend > 0.5) return <TrendingUp className="size-4 text-negative" />
    if (trend < 0.3) return <TrendingDown className="size-4 text-positive" />
    return <Minus className="size-4 text-muted-foreground" />
}

function CustomerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
    const customer = getCustomerData(id)
    const riskList = DEMO_DATASET.riskCustomers
    const idx = riskList.findIndex(c => c.id === id)
    const prev = idx > 0 ? riskList[idx - 1] : null
    const next = idx >= 0 && idx < riskList.length - 1 ? riskList[idx + 1] : null

    const color = RISK_COLOURS[customer.band]
    const components = [
        { label: 'RFM Decay', value: customer.rfmDecay, weight: 0.40 },
        { label: 'Return Rate', value: customer.returnRate, weight: 0.25 },
        { label: 'Gap Trend', value: customer.gapTrend, weight: 0.20 },
        { label: 'Anomaly', value: customer.anomaly, weight: 0.15 },
    ]

    return (
        <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
            {/* sheet */}
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-card border-l border-border shadow-2xl">
                {/* header */}
                <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <h2 className="num-tabular text-lg font-bold text-foreground">Customer {id}</h2>
                            <SegmentChip segment={customer.segment} />
                        </div>
                        <Gauge score={customer.score} band={customer.band} />
                    </div>
                    <div className="flex items-center gap-1 mt-1 shrink-0">
                        {prev && (
                            <button onClick={() => { }} aria-label="Previous customer"
                                className="flex size-7 items-center justify-center rounded-lg border border-border text-faint hover:bg-raised hover:text-foreground">
                                <ChevronLeft className="size-4" />
                            </button>
                        )}
                        {next && (
                            <button onClick={() => { }} aria-label="Next customer"
                                className="flex size-7 items-center justify-center rounded-lg border border-border text-faint hover:bg-raised hover:text-foreground">
                                <ChevronRight className="size-4" />
                            </button>
                        )}
                        <button onClick={onClose} aria-label="Close"
                            className="ml-1 flex size-7 items-center justify-center rounded-lg text-faint hover:bg-raised hover:text-foreground">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {/* Facts grid */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-2">Customer Facts</h3>
                        <dl className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'First purchase', val: customer.firstPurchase },
                                { label: 'Last purchase', val: customer.lastPurchase },
                                { label: 'Orders', val: customer.orders },
                                { label: 'Total revenue', val: formatGBP(customer.revenue) },
                                { label: 'Avg gap', val: customer.avgGap ? `${customer.avgGap}d` : '—' },
                                { label: 'Gap trend', val: <GapTrendIcon trend={customer.gapTrend} /> },
                            ].map(f => (
                                <div key={f.label} className="rounded-xl bg-raised/60 px-3 py-2">
                                    <dt className="text-[10px] text-faint mb-0.5">{f.label}</dt>
                                    <dd className="num-tabular text-sm font-semibold text-foreground">{f.val}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* Risk breakdown */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-2">Risk Breakdown</h3>
                        <RiskBadge band={customer.band} score={customer.score} />
                        <div className="mt-3 space-y-2">
                            {components.map(c => (
                                <div key={c.label}>
                                    <div className="flex justify-between text-xs mb-0.5">
                                        <span className="text-muted-foreground">{c.label}</span>
                                        <span className="num-tabular text-foreground">{(c.value * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-raised overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${c.value * 100}%`, background: color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Return rate vs portfolio */}
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-2">Return Rate</h3>
                        <div className="space-y-1.5">
                            <div>
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-muted-foreground">This customer</span>
                                    <span className="num-tabular text-foreground">{(customer.returnRate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-raised overflow-hidden">
                                    <div className="h-full rounded-full bg-negative" style={{ width: `${Math.min(customer.returnRate * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-muted-foreground">Portfolio avg</span>
                                    <span className="num-tabular text-foreground">5.12%</span>
                                </div>
                                <div className="h-2 rounded-full bg-raised overflow-hidden">
                                    <div className="h-full rounded-full bg-accent" style={{ width: '5.12%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
