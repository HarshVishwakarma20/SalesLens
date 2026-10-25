import { useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { useDataset } from '@/hooks/useDataset'
import { useDatasetStore } from '@/stores/dataset'
import { UploadPendingState, ProcessingState, ErrorState } from '@/components/ui/pending-state'
import { generatePdfReport } from '@/lib/pdf-report'
import { LeakagePanel, MonthlySalesPanel, RiskCustomersPanel, SegmentMixPanel } from './OverviewPanels'

export function OverviewPage() {
  const { data } = useDataset()
  const { status, error } = useDatasetStore()
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader
          title="Overview"
          description="Headline KPIs, sales, segments and leakage."
        />
        <ProcessingState />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader
          title="Overview"
          description="Headline KPIs, sales, segments and leakage."
        />
        <ErrorState message={error ?? 'Processing failed. Please try again.'} />
      </div>
    )
  }

  if (status === 'idle' || !data) {
    return (
      <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
        <PageHeader
          title="Overview"
          description="Upload a dataset to see headline KPIs, sales trends, segments, and leakage."
        />
        <UploadPendingState description="Please upload a file to generate analytics." />
      </div>
    )
  }

  const handleDownloadPdf = () => {
    if (isDownloadingPdf) return
    setIsDownloadingPdf(true)
    const toastId = toast.loading('Generating PDF Report...')
    generatePdfReport(data)
      .then(() => toast.success('PDF report downloaded!', { id: toastId }))
      .catch((err: any) => {
        console.error('PDF export failed:', err)
        toast.error('PDF generation failed: ' + (err?.message ?? 'Unknown error'), { id: toastId })
      })
      .finally(() => setIsDownloadingPdf(false))
  }

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Champions are 20.7% of customers and returns cost 5.12% of revenue."
        actions={
          <Button size="sm" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
            {isDownloadingPdf ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <FileText className="size-3.5" aria-hidden />
            )}
            {isDownloadingPdf ? 'Generating PDF...' : 'Download Report (PDF)'}
          </Button>
        }
      />
      <KpiGrid kpis={data?.kpis} />
      {data ? (
        <>
          <div className="grid grid-cols-12 gap-6">
            <MonthlySalesPanel data={data.monthly} />
            <SegmentMixPanel segments={data.segments} total={data.customers} />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <LeakagePanel leakage={data.leakage} />
            <RiskCustomersPanel customers={data.riskCustomers} />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-12 h-80 rounded-2xl lg:col-span-8" />
          <Skeleton className="col-span-12 h-80 rounded-2xl lg:col-span-4" />
        </div>
      )}
    </div>
  )
}
