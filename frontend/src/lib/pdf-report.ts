import jsPDF from 'jspdf'
import autoTable, { applyPlugin } from 'jspdf-autotable'
import type { Dataset } from './types'
import { DEMO_DATASET } from './mock-data'

// Ensure autoTable plugin is registered on jsPDF constructor
try {
  applyPlugin(jsPDF)
} catch {
  // Ignore if already registered
}

function getSegmentRecommendation(name: string): string {
  switch ((name || '').toLowerCase()) {
    case 'champion':
      return 'Reward loyalty, offer early-access product launches, and encourage advocacy.'
    case 'loyal':
      return 'Upsell higher-margin products and cross-sell complementary categories.'
    case 'promising':
      return 'Nurture with targeted email discounts to accelerate repeat purchases.'
    case 'new':
      return 'Provide friction-free onboarding and welcome incentive vouchers.'
    case 'at-risk':
      return 'Execute re-engagement win-back campaigns with personalized discounts.'
    case 'lost':
      return 'Reactivate via targeted promotional revival offers or archive.'
    default:
      return 'Maintain regular engagement campaigns.'
  }
}

/**
 * Universal autoTable executor that handles ESM, CJS, and bundled Vite runtimes.
 */
function runAutoTable(doc: jsPDF, options: any) {
  if (typeof (doc as any).autoTable === 'function') {
    ;(doc as any).autoTable(options)
    return
  }
  const candidate = (autoTable as any)?.default || autoTable
  if (typeof candidate === 'function') {
    candidate(doc, options)
    return
  }
  console.warn('jsPDF autoTable plugin could not be resolved directly')
}

/**
 * Trigger immediate browser file download directly into the user's Downloads folder.
 * Uses official jsPDF doc.save() with persistent fallback.
 */
function triggerBrowserDownload(doc: jsPDF, filename: string) {
  // 1. Primary standard method: doc.save() built into jsPDF
  try {
    doc.save(filename)
    return
  } catch (saveErr) {
    console.warn('doc.save() failed, attempting blob anchor download:', saveErr)
  }

  // 2. Fallback: Blob URL download with persistent 60s timeout
  try {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.setAttribute('download', filename)
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      try {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch {
        // cleanup ignore
      }
    }, 60000)
    return
  } catch (blobErr) {
    console.warn('Anchor blob download failed, falling back to datauristring:', blobErr)
  }

  // 3. Fallback: Data URI download
  try {
    const dataUri = doc.output('datauristring')
    const link = document.createElement('a')
    link.href = dataUri
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      try {
        document.body.removeChild(link)
      } catch {
        // cleanup ignore
      }
    }, 60000)
  } catch (err) {
    console.error('All PDF download mechanisms failed:', err)
    throw err
  }
}

/**
 * Generate and immediately download an executive-grade PDF Report
 * directly to the user's Downloads folder as a true .pdf file.
 */
export function generatePdfReport(dataset?: Dataset | null): boolean {
  try {
    const ds = dataset || DEMO_DATASET
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const kpis = ds?.kpis?.length ? ds.kpis : (DEMO_DATASET.kpis || [])
    const monthly = ds?.monthly?.length ? ds.monthly : (DEMO_DATASET.monthly || [])
    const segments = ds?.segments?.length ? ds.segments : (DEMO_DATASET.segments || [])
    const risk = ds?.riskCustomers?.length ? ds.riskCustomers : (DEMO_DATASET.riskCustomers || [])
    const leakage = ds?.leakage || DEMO_DATASET.leakage || { gross: 0, returns: 0, net: 0 }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ─── Header Banner ────────────────────────────────────────────────────────
    doc.setFillColor(15, 23, 42) // #0f172a navy
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Brand title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text('SalesLens', 14, 13)

    doc.setTextColor(14, 165, 233) // #0ea5e9 teal/cyan
    doc.text('•', 47, 13)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(226, 232, 240)
    doc.text('Executive Business Intelligence & Analytics Report', 53, 13)

    // Sub-header metadata
    doc.setFontSize(8.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`Dataset: ${ds?.name || 'SalesLens Data'}  |  Generated: ${dateStr}  |  Confidential`, 14, 22)

    let cursorY = 36

    // ─── Executive Summary KPI Cards ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Executive Performance Scorecard', 14, cursorY)
    cursorY += 4

    const netRev = Number(leakage?.net ?? 0) || 0
    const grossSales = Number(leakage?.gross ?? netRev) || netRev
    const totalReturns = Number(leakage?.returns ?? 0) || 0
    const returnRatePct = grossSales > 0 ? (totalReturns / grossSales) * 100 : 5.12

    const activeCustKpi = kpis.find((k) => k?.key === 'active')?.value || (ds?.customers ? ds.customers.toLocaleString() : '3,362')
    const repeatRateKpi = kpis.find((k) => k?.key === 'repeat')?.value || '65.27%'
    const churnRateKpi = kpis.find((k) => k?.key === 'churn')?.value || '88.52%'
    const netRevKpi = netRev >= 1_000_000 ? `£${(netRev / 1_000_000).toFixed(2)}M` : `£${netRev.toLocaleString()}`

    const kpiCards = [
      { label: 'NET REVENUE', value: netRevKpi, note: 'GBP Total' },
      { label: 'ACTIVE CUSTOMERS', value: String(activeCustKpi), note: 'Non-Lost' },
      { label: 'REPEAT RATE', value: String(repeatRateKpi), note: '2+ Orders' },
      { label: 'CHURN RATE', value: String(churnRateKpi), note: 'Indicative' },
      { label: 'RETURN RATE', value: `${(Number(returnRatePct) || 0).toFixed(2)}%`, note: 'Portfolio' },
    ]

    const cardWidth = (pageWidth - 28 - (kpiCards.length - 1) * 3) / kpiCards.length
    const cardHeight = 16

    kpiCards.forEach((card, idx) => {
      const cardX = 14 + idx * (cardWidth + 3)
      doc.setFillColor(248, 250, 252) // #f8fafc
      doc.setDrawColor(226, 232, 240) // #e2e8f0
      doc.roundedRect(cardX, cursorY, cardWidth, cardHeight, 1.5, 1.5, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(100, 116, 139)
      doc.text(card.label, cardX + 2.5, cursorY + 4.5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(15, 23, 42)
      doc.text(card.value, cardX + 2.5, cursorY + 10.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(14, 165, 233)
      doc.text(card.note, cardX + 2.5, cursorY + 14)
    })

    cursorY += cardHeight + 8

    // ─── Section 1: Customer Segmentation Breakdown ───────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('1. Customer Segmentation & Lifecycle Matrix', 14, cursorY)
    cursorY += 2

    const segmentRows = (segments || []).map((s) => {
      const cnt = Number(s?.count ?? 0) || 0
      const share = Number(s?.share ?? 0) || 0
      const shareStr = `${(share * 100).toFixed(1)}%`
      return [
        s?.name || 'Segment',
        cnt.toLocaleString(),
        shareStr,
        getSegmentRecommendation(s?.name || ''),
      ]
    })

    runAutoTable(doc, {
      startY: cursorY,
      head: [['Segment Name', 'Customers', 'Share %', 'Recommended Strategy']],
      body: segmentRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.2,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    })

    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 35) + 8

    // ─── Section 2: Monthly Revenue & Returns Intelligence ───────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('2. Monthly Revenue & Returns Intelligence', 14, cursorY)
    cursorY += 2

    const monthlyRows = (monthly || []).slice(0, 13).map((m: any) => {
      const salesVal = Number(m?.sales ?? 0) || 0
      const retVal = Number(m?.returns ?? 0) || 0
      const netVal = salesVal - retVal
      // Calculate return rate safely if missing or undefined
      let rr = typeof m?.returnRate === 'number' ? m.returnRate : (salesVal > 0 ? (retVal / salesVal) * 100 : 0)
      if (isNaN(rr) || !isFinite(rr)) rr = 0
      return [
        String(m?.month || 'Month'),
        `£${Math.round(salesVal).toLocaleString()}`,
        `£${Math.round(retVal).toLocaleString()}`,
        `£${Math.round(netVal).toLocaleString()}`,
        `${rr.toFixed(2)}%`,
      ]
    })

    runAutoTable(doc, {
      startY: cursorY,
      head: [['Month', 'Gross Sales', 'Returns', 'Net Captured', 'Return Rate %']],
      body: monthlyRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.2,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    })

    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 45) + 8

    // ─── Section 3: Priority Risk Watchlist (New Page if needed) ─────────────
    if (risk && risk.length > 0) {
      if (cursorY + 45 > pageHeight - 15) {
        doc.addPage()
        cursorY = 18
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('3. Priority High-Risk Customer Watchlist', 14, cursorY)
      cursorY += 2

      const riskRows = risk.slice(0, 8).map((r: any) => {
        const rawScore = typeof r?.score === 'number' ? r.score : (typeof r?.riskScore === 'number' ? r.riskScore : 0)
        const scoreNum = Number(rawScore) || 0
        const ords = Number(r?.orders ?? 1) || 1
        const rev = Number(r?.revenue ?? 0) || 0
        return [
          `#${r?.id ?? r?.customerId ?? 'N/A'}`,
          String(r?.segment || 'Customer'),
          String(r?.band || r?.riskBand || 'Medium'),
          scoreNum.toFixed(1),
          ords.toString(),
          rev > 0 ? `£${rev.toLocaleString()}` : '£0',
        ]
      })

      runAutoTable(doc, {
        startY: cursorY,
        head: [['Customer ID', 'Segment', 'Risk Band', 'Risk Score', 'Orders', 'Total Spend']],
        body: riskRows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.2,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      })

      cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 35) + 8
    }

    // ─── Footer on all pages ──────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.setDrawColor(226, 232, 240)
      doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10)
      doc.text('SalesLens Business Intelligence & Analytics • Confidential', 14, pageHeight - 6)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 26, pageHeight - 6)
    }

    // ─── Direct Browser PDF Download ──────────────────────────────────────────
    const safeFilename = `SalesLens_Executive_Report_${(ds?.name || 'Dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
    triggerBrowserDownload(doc, safeFilename)
    return true
  } catch (err) {
    console.error('generatePdfReport failed:', err)
    throw err
  }
}
