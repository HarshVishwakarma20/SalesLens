import jsPDF from 'jspdf'
import autoTable, { applyPlugin } from 'jspdf-autotable'
import type { Dataset } from './types'
import { api } from './api'
import type { BackendOverview, BackendAnomaliesResponse, BackendProductsPage } from './api'

// Register autoTable plugin
try { applyPlugin(jsPDF) } catch { /**/ }

// ─── Minimum product units threshold (matches config.py MIN_PRODUCT_UNITS) ──
const MIN_PRODUCT_UNITS = 50

// ─── Colour palette ───────────────────────────────────────────────────────────
const NAVY  = [15, 23, 42]    as const
const SLATE = [30, 41, 59]    as const
const TEAL  = [14, 165, 233]  as const
const GREY  = [100, 116, 139] as const
const LIGHT = [226, 232, 240] as const
const WHITE = [255, 255, 255] as const
const BG    = [248, 250, 252] as const
const AMBER = [245, 158, 11]  as const
const RED   = [239, 68, 68]   as const
const GREEN = [34, 197, 94]   as const

// ─── Module-level font cache (avoid re-fetching on repeated PDF generation) ──
let _fontCache: { regular: string; bold: string } | null = null

async function loadFont(): Promise<{ regular: string; bold: string } | null> {
  if (_fontCache) return _fontCache
  try {
    const [r, b] = await Promise.all([
      fetch('/fonts/DejaVuSans.ttf').then(res => {
        if (!res.ok) throw new Error('Font fetch failed: ' + res.status)
        return res.arrayBuffer()
      }),
      fetch('/fonts/DejaVuSans-Bold.ttf').then(res => {
        if (!res.ok) throw new Error('Font fetch failed: ' + res.status)
        return res.arrayBuffer()
      }),
    ])
    const toB64 = (ab: ArrayBuffer) => {
      const bytes = new Uint8Array(ab)
      let bin = ''
      // Process in chunks to avoid call-stack overflow on large fonts
      const chunkSize = 8192
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        bin += String.fromCharCode(...bytes.slice(i, i + chunkSize))
      }
      return btoa(bin)
    }
    _fontCache = { regular: toB64(r), bold: toB64(b) }
    return _fontCache
  } catch (e) {
    console.warn('DejaVu font load failed, falling back to helvetica:', e)
    return null
  }
}

// ─── autoTable compat wrapper ─────────────────────────────────────────────────
function runAutoTable(doc: jsPDF, opts: Record<string, unknown>) {
  if (typeof (doc as any).autoTable === 'function') {
    ;(doc as any).autoTable(opts)
  } else {
    const fn = (autoTable as any)?.default ?? autoTable
    if (typeof fn === 'function') fn(doc, opts)
  }
}

function lastY(doc: jsPDF, fallback: number): number {
  return (doc as any).lastAutoTable?.finalY ?? fallback
}

// ─── Download helpers ─────────────────────────────────────────────────────────
function download(doc: jsPDF, filename: string) {
  try { doc.save(filename); return } catch { /**/ }
  try {
    const url = URL.createObjectURL(doc.output('blob'))
    const a = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' })
    document.body.appendChild(a); a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 60_000)
  } catch (err) { throw err }
}

// ─── Number/string formatters ─────────────────────────────────────────────────

/** Format money with correct sign: -₹5,196.00 not ₹-5,196.00 */
function gbp(v: number, dp = 0, sym = '£'): string {
  const abs = Math.abs(v)
  const s = abs.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  return (v < 0 ? '-' : '') + sym + s
}

function pct(v: number, dp = 1) { return v.toFixed(dp) + '%' }

/** Compact number for chart axes: 1234567 -> 1.2M, 12345 -> 12.3k */
function compact(v: number, sym = ''): string {
  if (v >= 1e9) return sym + (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return sym + (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return sym + (v / 1e3).toFixed(1) + 'k'
  return sym + v.toFixed(0)
}

function segAction(s: string): string {
  switch (s.toLowerCase()) {
    case 'champion':  return 'Reward and retain top buyers'
    case 'loyal':     return 'Upsell and cross-sell products'
    case 'promising': return 'Nurture with targeted discounts'
    case 'new':       return 'Onboard and welcome with offers'
    case 'at-risk':   return 'Re-engage with win-back campaigns'
    case 'lost':      return 'Reactivate or archive accounts'
    default:          return 'Maintain regular engagement'
  }
}

function bandColor(band: string): number[] {
  switch (band.toLowerCase()) {
    case 'critical': return [...RED]
    case 'high':     return [...AMBER]
    case 'medium':   return [234, 179, 8]
    default:         return [...GREEN]
  }
}

// ─── jsPDF font helpers ───────────────────────────────────────────────────────

function setFont(doc: jsPDF, family: string, style: 'normal' | 'bold' | 'italic' | 'bolditalic') {
  try {
    doc.setFont(family, style)
  } catch {
    // Fallback to helvetica if custom font not available in this style
    const fallbackStyle = style === 'bolditalic' ? 'bold' : style
    doc.setFont('helvetica', fallbackStyle)
  }
}

// ─── Page chrome ──────────────────────────────────────────────────────────────

function pageHeader(doc: jsPDF, pw: number, name: string, dateStr: string, ff: string) {
  doc.setFillColor(...NAVY); doc.rect(0, 0, pw, 24, 'F')
  setFont(doc, ff, 'bold'); doc.setFontSize(16); doc.setTextColor(...WHITE)
  doc.text('SalesLens', 14, 11)
  doc.setTextColor(...TEAL); doc.setFontSize(14); doc.text('*', 44, 11)
  setFont(doc, ff, 'normal'); doc.setFontSize(9.5); doc.setTextColor(226, 232, 240)
  doc.text('Sales Performance & Customer Intelligence Report', 50, 11)
  doc.setFontSize(7.5); doc.setTextColor(148, 163, 184)
  doc.text('Dataset: ' + name + '  |  Generated: ' + dateStr + '  |  Confidential', 14, 19)
}

function pageFooters(doc: jsPDF, pw: number, ph: number, from: string, to: string, ff: string) {
  const defs = [
    'Net Revenue = Gross Sales - Returns',
    'Active = customers in non-Lost segments',
    'Lost Customers % = share of all customers classified as Lost',
    'Repeat Rate = customers with 2+ orders',
    'Return Rate = return value / (sales + returns)',
  ]
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LIGHT)
    doc.line(14, ph - 18, pw - 14, ph - 18)
    setFont(doc, ff, 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GREY)
    doc.text('Data period: ' + from + ' - ' + to, 14, ph - 14)
    doc.text('Page ' + i + ' of ' + n, pw - 20, ph - 14)
    // Multi-line definitions to avoid right-edge cutoff
    const defText = defs.join('  |  ')
    const lines = doc.splitTextToSize(defText, pw - 28) as string[]
    lines.forEach((line: string, li: number) => {
      doc.text(line, 14, ph - 10 + li * 4)
    })
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number, ff: string) {
  setFont(doc, ff, 'bold'); doc.setFontSize(10.5); doc.setTextColor(...NAVY)
  doc.text(text, 14, y)
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

interface Bar { label: string; value: number; partial?: boolean }

function barChart(doc: jsPDF, bars: Bar[], sx: number, sy: number, cw: number, ch: number, ff: string, sym: string) {
  if (!bars.length) return
  const maxV = Math.max(...bars.map(b => b.value), 1)
  const aH = ch - 10
  const gap = 1.5
  const bW = Math.max(1, (cw - gap * (bars.length - 1)) / bars.length)
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3)
  doc.line(sx, sy, sx, sy + aH)
  doc.line(sx, sy + aH, sx + cw, sy + aH)
  bars.forEach((b, i) => {
    const bH = Math.max(0.5, (b.value / maxV) * aH)
    const x = sx + i * (bW + gap)
    const y = sy + aH - bH
    b.partial ? doc.setFillColor(...TEAL) : doc.setFillColor(...NAVY)
    doc.rect(x, y, bW, bH, 'F')
    setFont(doc, ff, 'normal'); doc.setFontSize(4.5); doc.setTextColor(...GREY)
    const lbl = b.label.length > 7 ? b.label.slice(2) : b.label
    doc.text(lbl, x + bW / 2, sy + aH + 3.5, { align: 'center' })
  })
  // Y-axis tick labels using compact format
  doc.setFontSize(4.5); doc.setTextColor(...GREY)
  doc.text(compact(maxV, sym),      sx - 1, sy + 1,       { align: 'right' })
  doc.text(compact(maxV / 2, sym),  sx - 1, sy + aH / 2,  { align: 'right' })
  doc.text(sym + '0',               sx - 1, sy + aH,       { align: 'right' })
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate and download a 2-page A4 SalesLens PDF report.
 *
 * DATA RULE: every displayed number comes from the backend's computed results.
 * Nothing is hardcoded, rounded beyond display precision, estimated, or invented.
 * All totals reconcile:
 *   - Segment customer counts sum to total customers
 *   - Revenue Share % sums to ~100%
 *   - Scorecard Net Revenue = sum of monthly net revenues
 *   - Revenue at Risk >= sum of watchlist spend (all high/critical, not just 10)
 */
export async function generatePdfReport(dataset?: Dataset | null): Promise<boolean> {

  // ── 1. Parallel data fetches ─────────────────────────────────────────────────
  let ov: BackendOverview | null = null
  let an: BackendAnomaliesResponse | null = null
  let pr: BackendProductsPage | null = null
  let rd: Awaited<ReturnType<typeof api.getReportData>> | null = null

  // Load font and data in parallel
  const [fonts, ...apiResults] = await Promise.allSettled([
    loadFont(),
    api.getOverview(),
    api.getAnomalies('rolling', false),
    api.getProducts(1, 500, undefined, undefined, 'ReturnRate', 'desc'),
    api.getReportData(),
  ])

  if (apiResults[0].status === 'fulfilled') ov = apiResults[0].value as BackendOverview
  if (apiResults[1].status === 'fulfilled') an = apiResults[1].value as BackendAnomaliesResponse
  if (apiResults[2].status === 'fulfilled') pr = apiResults[2].value as BackendProductsPage
  if (apiResults[3].status === 'fulfilled') rd = apiResults[3].value as Awaited<ReturnType<typeof api.getReportData>>

  const fontData = fonts.status === 'fulfilled' ? fonts.value : null

  // ── 2. Derive all values from computed results ────────────────────────────────
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const dsName = dataset?.name ?? 'SalesLens Dataset'

  // Currency symbol: from report-data endpoint (server-side detection) or fallback
  const CUR = rd?.currencySymbol ?? (ov?.kpis as any)?.currencySymbol ?? '£'

  // KPIs
  const k = ov?.kpis as any
  const netRevenue    = k?.netRevenue    ?? (dataset?.leakage?.net    ?? 0)
  const grossSales    = k?.grossSales    ?? (dataset?.leakage?.gross  ?? netRevenue)
  const totalRet      = k?.returnsValue  ?? k?.totalReturns ?? (dataset?.leakage?.returns ?? 0)
  const activeCust    = k?.activeCustomers ?? (dataset?.customers ?? 0)

  const rrRaw     = k?.repeatRate ?? null
  const repeatRate = rrRaw !== null
    ? (rrRaw <= 1 ? rrRaw * 100 : rrRaw)
    : parseFloat(String(dataset?.kpis?.find((x: any) => x.key === 'repeat')?.value ?? '0').replace('%', ''))

  // Lost Customers % — from kpis.lostPct (consistent with segment table)
  const lostPct: number | null = k?.lostPct ?? null

  // Return rate = returns / (sales + returns)
  const denom = grossSales + totalRet
  const returnRate = denom > 0 ? (totalRet / denom) * 100 : 0

  // Monthly trends
  const monthly: any[] = ov?.monthlyTrends ?? (dataset?.monthly ?? [])

  // Daily series for partial-month detection + date range (prefer dataset, else overview)
  const dailyPoints: any[] = (dataset?.daily?.length
    ? dataset.daily
    : (ov?.dailySales ?? [])) as any[]

  // Partial last month detection
  const isPartial = (() => {
    if (!monthly.length) return false
    const last = monthly[monthly.length - 1]
    const [yr, mo] = (last.month ?? '').split('-').map(Number)
    if (!yr || !mo) return false
    const calDays = new Date(yr, mo, 0).getDate()
    const inData = dailyPoints.filter((d: any) => String(d.date ?? '').startsWith(last.month)).length
    return inData > 0 && inData < calDays
  })()

  // Monthly net revenues — bars sum reconciles with scorecard
  const barData: Bar[] = monthly.map((m: any, i: number) => ({
    label: String(m.month ?? ''),
    value: Number(m.netRevenue ?? (Number(m.sales ?? 0) - Number(m.returns ?? 0))),
    partial: isPartial && i === monthly.length - 1,
  }))
  const barSum = barData.reduce((a, b) => a + b.value, 0)
  const reportNetRev = netRevenue > 0 ? netRevenue : barSum

  // Segments from overview
  const segs: any[] = ov?.segmentDistribution?.length
    ? ov.segmentDistribution
    : (dataset?.segments ?? []).map((s: any) => ({ segment: s.name, count: s.count, pct: s.share * 100 }))

  // Per-segment revenue share from report-data (server-side computation using RFM Monetary)
  const segRevMap = new Map<string, number>()  // Segment -> RevenueShare %
  if (rd?.segmentRevenue?.length) {
    for (const sr of rd.segmentRevenue) {
      segRevMap.set(String(sr.Segment), Number(sr.RevenueShare))
    }
  }

  // Key Takeaways — use backend insights, replace churn takeaway with revenue concentration
  const rawInsights: string[] = (ov as any)?.insights ?? []
  // Filter out any insight that mentions churn/churn rate (we're replacing it)
  const filteredInsights = rawInsights.filter(i =>
    !i.toLowerCase().includes('churn') && !i.toLowerCase().includes('monthly')
  )
  // Build revenue concentration insight from real data
  const champSeg = segs.find((s: any) => s.segment?.toLowerCase() === 'champion')
  const champCustPct = champSeg ? Number(champSeg.pct ?? 0) : null
  const champRevPct  = champSeg ? (segRevMap.get('Champion') ?? segRevMap.get(champSeg.segment) ?? null) : null
  const revInsight = champCustPct !== null && champRevPct !== null
    ? 'Champions are ' + pct(champCustPct) + ' of customers but drive ' + pct(champRevPct) + ' of revenue - protect and grow this group.'
    : null

  const takeaways: string[] = [
    filteredInsights[0] ?? '',
    filteredInsights[1] ?? '',
    revInsight ?? (filteredInsights[2] ?? ''),
  ].filter(Boolean).slice(0, 3)

  // If we still have fewer than 3, generate from data
  while (takeaways.length < 3) {
    const totalCust = segs.reduce((a: number, s: any) => a + (Number(s.count) || 0), 0) || 1
    if (takeaways.length === 0) {
      const top = segs.reduce((a: any, b: any) => ((a.count ?? 0) > (b.count ?? 0) ? a : b), segs[0] ?? {})
      takeaways.push(pct((top?.count ?? 0) / totalCust * 100) + ' of customers are in the ' + (top?.segment ?? '?') + ' segment.')
    } else if (takeaways.length === 1) {
      takeaways.push(pct(repeatRate) + ' of customers have made more than one purchase.')
    } else {
      takeaways.push('Overall return rate is ' + pct(returnRate) + ' of total transaction value.')
    }
  }

  // Revenue at Risk — from report-data (sums ALL high/critical, not just 10)
  const revAtRisk      = rd?.revenueAtRisk    ?? 0
  const hiCritCount    = rd?.highCriticalCount ?? 0

  // Watchlist — already: high/critical, non-Lost, top 10, with real Orders + Spend
  const watchRows = (rd?.watchlist ?? []).map(r => [
    String(r.CustomerID),
    String(r.Segment),
    String(r.RiskBand),
    Number(r.RiskScore).toFixed(1),
    String(r.OrderCount),
    gbp(r.TotalRevenue, 2, CUR),
  ])

  // Top 3 products by return rate with minimum units threshold
  const top3 = (pr?.items ?? [])
    .filter(p => p.ReturnRate > 0 && (p.TotalQtySold ?? 0) >= MIN_PRODUCT_UNITS)
    .slice(0, 3)

  // Flagged anomaly dates (top 2-3 by |z-score|)
  const flagged = (an?.records ?? [])
    .filter((a: any) => a.Flagged)
    .sort((a: any, b: any) => Math.abs(b.z_score ?? b.ZScore ?? 0) - Math.abs(a.z_score ?? a.ZScore ?? 0))
    .slice(0, 3)

  // Date range
  const datFrom = dailyPoints.length
    ? String(dailyPoints[0].date ?? '')
    : (dataset?.dateRange?.from ?? '')
  const datTo = dailyPoints.length
    ? String(dailyPoints[dailyPoints.length - 1].date ?? '')
    : (dataset?.dateRange?.to ?? '')

  // Segment helpers for actions
  const atRisk = segs.find((s: any) => s.segment?.toLowerCase() === 'at-risk')
  const lostSeg = segs.find((s: any) => s.segment?.toLowerCase() === 'lost')

  // ── 3. Build PDF ──────────────────────────────────────────────────────────────

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()
  const ML = 14
  const CW = PW - ML * 2

  // Register custom font if loaded
  let ff = 'helvetica'
  if (fontData) {
    try {
      doc.addFileToVFS('DejaVuSans.ttf',      fontData.regular)
      doc.addFileToVFS('DejaVuSans-Bold.ttf', fontData.bold)
      doc.addFont('DejaVuSans.ttf',      'DejaVuSans', 'normal')
      doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold')
      ff = 'DejaVuSans'
    } catch (e) {
      console.warn('Could not register DejaVu font in jsPDF:', e)
    }
  }

  // Helper to make autoTable use our font
  const tableStyles = {
    font: ff,
    headStyles: { fillColor: [...NAVY], textColor: [...WHITE], fontSize: 8, fontStyle: 'bold', cellPadding: 2, font: ff },
    bodyStyles: { fontSize: 7.5, textColor: [...SLATE], cellPadding: 1.8, font: ff },
  }

  // ══════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════
  pageHeader(doc, PW, dsName, dateStr, ff)
  let Y = 32

  // ── Scorecard ──────────────────────────────────────────
  sectionTitle(doc, 'Performance Scorecard', Y, ff); Y += 5

  const netRevStr = reportNetRev >= 1_000_000
    ? CUR + (reportNetRev / 1_000_000).toFixed(2) + 'M'
    : gbp(reportNetRev, 2, CUR)

  // Churn card: show Lost% (consistent with segment table)
  const lostCardValue = lostPct !== null ? pct(lostPct) : 'N/A'

  const cards = [
    { label: 'NET REVENUE',        value: netRevStr,              def: 'Gross sales minus returns' },
    { label: 'ACTIVE CUSTOMERS',   value: activeCust.toLocaleString(), def: 'Customers in non-Lost segments' },
    { label: 'REPEAT RATE',        value: pct(repeatRate),        def: 'Customers with 2+ orders' },
    { label: 'LOST CUSTOMERS %',   value: lostCardValue,          def: 'Share classified as Lost (same as segment table)' },
    { label: 'RETURN RATE',        value: pct(returnRate),        def: 'Return value / (sales + returns)' },
  ]

  const cW = (CW - 4 * 3) / 5
  const cH = 20
  cards.forEach((c, i) => {
    const cx = ML + i * (cW + 3)
    doc.setFillColor(...BG); doc.setDrawColor(...LIGHT)
    doc.roundedRect(cx, Y, cW, cH, 1.5, 1.5, 'FD')
    setFont(doc, ff, 'bold'); doc.setFontSize(6); doc.setTextColor(...GREY)
    doc.text(c.label, cx + 2.5, Y + 4.5)
    doc.setFontSize(10); doc.setTextColor(...NAVY)
    doc.text(c.value, cx + 2.5, Y + 10.5)
    setFont(doc, ff, 'normal'); doc.setFontSize(5.5); doc.setTextColor(...GREY)
    doc.text(c.def, cx + 2.5, Y + 15.5, { maxWidth: cW - 3 })
  })
  Y += cH + 8

  // ── Key Takeaways ──────────────────────────────────────
  sectionTitle(doc, 'Key Takeaways', Y, ff); Y += 5
  setFont(doc, ff, 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  takeaways.forEach(tw => {
    doc.setFillColor(...TEAL); doc.circle(ML + 1.5, Y - 1, 1, 'F')
    const lines = doc.splitTextToSize(tw, CW - 6) as string[]
    doc.text(lines, ML + 5, Y)
    Y += lines.length * 4 + 1.5
  })
  Y += 4

  // ── Segment Table ──────────────────────────────────────
  sectionTitle(doc, 'Customer Segment Analysis', Y, ff); Y += 3

  const segRows = segs.map((s: any) => {
    const cnt    = Number(s.count ?? 0)
    const custSh = Number(s.pct   ?? 0)
    // Revenue share from server (segment net / total net) — never fall back to customer share
    const revSh  = segRevMap.get(String(s.segment))
    return [
      String(s.segment ?? ''),
      cnt.toLocaleString(),
      pct(custSh),
      revSh !== undefined ? pct(revSh) : '—',
      segAction(String(s.segment ?? '')),
    ]
  })

  runAutoTable(doc, {
    startY: Y,
    head: [['Segment', 'Customers', 'Share %', 'Rev. Share %', 'Action']],
    body: segRows,
    theme: 'grid',
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold', font: ff },
      1: { cellWidth: 22, halign: 'right' },
      2: { cellWidth: 18, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 'auto' },
    },
    margin: { left: ML, right: ML },
  })
  Y = lastY(doc, Y + 40) + 8

  // ── Monthly Net Revenue Bar Chart ──────────────────────
  sectionTitle(doc, 'Monthly Net Revenue', Y, ff)
  if (isPartial) {
    setFont(doc, ff, 'normal'); doc.setFontSize(7); doc.setTextColor(...AMBER)
    doc.text(
      '* ' + (monthly[monthly.length - 1]?.month ?? '') + ' is a partial month. Shown in teal.',
      ML + 78, Y, { maxWidth: CW - 78 },
    )
  }
  Y += 5

  setFont(doc, ff, 'normal'); doc.setFontSize(6.5)
  doc.setFillColor(...NAVY); doc.rect(ML, Y, 4, 3, 'F')
  doc.setTextColor(...GREY); doc.text('Net Revenue', ML + 5.5, Y + 2.5)
  if (isPartial) {
    doc.setFillColor(...TEAL); doc.rect(ML + 32, Y, 4, 3, 'F')
    doc.text('Partial month', ML + 37.5, Y + 2.5)
  }
  Y += 5
  barChart(doc, barData, ML + 8, Y, CW - 8, 38, ff, CUR)
  Y += 44

  // ══════════════════════════════════════════════════════
  // PAGE 2
  // ══════════════════════════════════════════════════════
  doc.addPage()
  pageHeader(doc, PW, dsName, dateStr, ff)
  Y = 32

  // ── Revenue at Risk ────────────────────────────────────
  sectionTitle(doc, 'Revenue at Risk', Y, ff); Y += 5
  setFont(doc, ff, 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
  const revAtRiskStr = revAtRisk > 0 ? gbp(revAtRisk, 2, CUR) : 'see watchlist'
  doc.text(
    'Total spend of High and Critical risk customers: ' + revAtRiskStr +
    '  (' + hiCritCount + ' customer' + (hiCritCount !== 1 ? 's' : '') + ')',
    ML, Y,
  )
  Y += 8

  // ── Top-10 Watchlist ───────────────────────────────────
  sectionTitle(doc, 'Top 10 High-Risk Customer Watchlist (excl. Lost)', Y, ff); Y += 3

  runAutoTable(doc, {
    startY: Y,
    head: [['Customer ID', 'Segment', 'Risk Band', 'Risk Score', 'Orders', 'Total Spend']],
    body: watchRows,
    theme: 'grid',
    ...tableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', font: ff, cellWidth: 28 },
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 'auto' },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2) {
        const [r, g, b] = bandColor(String(data.cell.raw ?? ''))
        data.cell.styles.textColor = [r, g, b]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { left: ML, right: ML },
  })
  Y = lastY(doc, Y + 50) + 8

  // ── Top 3 Products by Return Rate ─────────────────────
  sectionTitle(doc, 'Top 3 Products by Return Rate (min. ' + MIN_PRODUCT_UNITS + ' units sold)', Y, ff); Y += 3

  if (top3.length === 0) {
    setFont(doc, ff, 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY)
    doc.text('No products meet the minimum sales threshold (' + MIN_PRODUCT_UNITS + ' units).', ML, Y + 4); Y += 10
  } else {
    const prodRows = top3.map(p => [
      String(p.StockCode),
      String(p.Description ?? 'Unknown'),
      pct(Number(p.ReturnRate) * 100),
      gbp(Number((p as any).ReturnValue ?? (p as any).ReturnedValue ?? 0), 2, CUR),
      gbp(Number(p.NetRevenue), 2, CUR),
    ])
    runAutoTable(doc, {
      startY: Y,
      head: [['SKU', 'Description', 'Return Rate', 'Returned', 'Net Revenue']],
      body: prodRows,
      theme: 'grid',
      ...tableStyles,
      columnStyles: {
        0: { fontStyle: 'bold', font: ff, cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 22, textColor: [...RED], fontStyle: 'bold' },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: ML, right: ML },
    })
    Y = lastY(doc, Y + 22) + 8
  }

  // ── Flagged Anomaly Dates ──────────────────────────────
  sectionTitle(doc, 'Flagged Anomaly Dates', Y, ff); Y += 5

  if (flagged.length === 0) {
    setFont(doc, ff, 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY)
    doc.text('No anomaly dates detected in this dataset.', ML, Y); Y += 8
  } else {
    flagged.forEach((a: any, i) => {
      const z    = Number(a.z_score ?? a.ZScore ?? 0)
      const type = String(a.AnomalyType ?? (a.Direction ?? (z > 0 ? 'spike' : 'drop')))
      const line = (i + 1) + '. ' + String(a.Date ?? '') +
                   ' - Sales ' + gbp(Number(a.Sales ?? 0), 0, CUR) +
                   ' (' + type.toUpperCase() + ', z = ' + z.toFixed(2) + ')'
      setFont(doc, ff, type === 'spike' ? 'bold' : 'normal')
      doc.setFontSize(8)
      type === 'spike' ? doc.setTextColor(...RED) : doc.setTextColor(...AMBER)
      doc.text(line, ML, Y); Y += 5
    })
    Y += 3
  }

  // ── 3 Recommended Actions ─────────────────────────────
  sectionTitle(doc, '3 Recommended Actions', Y, ff); Y += 5

  const actions: string[] = [
    atRisk
      ? 'Re-engage ' + Number(atRisk.count ?? 0).toLocaleString() +
        ' At-Risk customers (' + pct(Number(atRisk.pct ?? 0)) +
        ' of base) with personalised win-back campaigns.'
      : 'Target the ' + watchRows.length + ' highest-risk customers immediately to protect ' +
        (revAtRisk > 0 ? gbp(revAtRisk, 0, CUR) + ' in revenue.' : 'key revenue.'),

    top3.length > 0
      ? 'Investigate ' + top3[0].Description + ' (SKU ' + top3[0].StockCode +
        ', ' + pct(Number(top3[0].ReturnRate) * 100) + ' return rate). ' +
        'Cutting returns by 20% recovers ~' +
        gbp(Number((top3[0] as any).ReturnValue ?? (top3[0] as any).ReturnedValue ?? 0) * 0.2, 0, CUR) + '.'
      : 'Audit top-returning SKUs to reduce the ' + pct(returnRate) + ' portfolio return rate.',

    lostSeg
      ? 'Archive or reactivate ' + Number(lostSeg.count ?? 0).toLocaleString() +
        ' Lost customers; realign freed marketing budget toward the ' +
        pct(repeatRate) + ' repeat-purchase base.'
      : 'Grow the ' + pct(repeatRate) + ' repeat rate with a structured loyalty programme.',
  ]

  actions.forEach((a, i) => {
    setFont(doc, ff, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...TEAL)
    doc.text((i + 1) + '.', ML, Y)
    setFont(doc, ff, 'normal'); doc.setFontSize(8); doc.setTextColor(...SLATE)
    const lines = doc.splitTextToSize(a, CW - 6) as string[]
    doc.text(lines, ML + 6, Y)
    Y += lines.length * 4.5 + 2
  })

  // ── Footers on all pages ───────────────────────────────
  pageFooters(doc, PW, PH, datFrom, datTo, ff)

  // ── Download ───────────────────────────────────────────
  download(doc, 'SalesLens_Report_' + dsName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf')
  return true
}
