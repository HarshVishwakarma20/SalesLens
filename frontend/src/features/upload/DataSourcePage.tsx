import { useState } from 'react'
import { FileCheck2, FileSpreadsheet, Sparkles, Upload } from 'lucide-react'
import type { UploadMode } from '@/lib/types'
import { UploadCard } from './UploadCard'
import { ValidationPanel } from './ValidationPanel'
import { RecentDatasets } from './RecentDatasets'

const SPREADSHEET_ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
}

export function DataSourcePage() {
  const [upload, setUpload] = useState<{ file: File; mode: UploadMode } | null>(null)

  const handleFile = (mode: UploadMode) => (file: File) => setUpload({ file, mode })

  return (
    <div className="mx-auto flex max-w-[1440px] animate-fadeIn flex-col gap-8">
      <div className="relative max-w-[680px] py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-10 h-[400px] w-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.14) 0%, transparent 70%)' }}
        />
        <div className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-accent shadow-[0_0_15px_rgba(0,245,212,0.15)]">
          <Sparkles className="size-3.5 text-accent" />
          <span>From raw noise to refined insight</span>
        </div>
        <h1 className="relative text-4xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-[44px]">
          See your customers <span className="accent-gradient-text">clearly.</span>
        </h1>
        <p className="relative mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
          Upload your retail data. Acuity turns it into segments, retention, revenue leakage and risk scores — no
          black-box ML.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <UploadCard
          icon={FileCheck2}
          dropIcon={Upload}
          badge="Fastest"
          badgeTone="accent"
          title="Upload cleaned data"
          description="Accepts pre-formatted .xlsx, .csv or .parquet files with standardized columns."
          dropLabel="Drag & drop or click to browse"
          dropHint=".xlsx, .csv, .parquet"
          footer="Skips cleaning. Ready in seconds."
          accept={{ ...SPREADSHEET_ACCEPT, 'application/octet-stream': ['.parquet'] }}
          onFile={handleFile('cleaned')}
        />
        <UploadCard
          icon={Sparkles}
          dropIcon={FileSpreadsheet}
          dropIconClassName="text-accent-2"
          badge="Cleans automatically"
          badgeTone="info"
          title="Upload raw data"
          description="Accepts original UCI retail formats. Runs automated cleaning pipeline."
          dropLabel="Drag & drop raw retail file"
          dropHint="retail .xlsx or .csv"
          footer="Standardizes columns, pairs returns, and cleans data."
          accept={SPREADSHEET_ACCEPT}
          onFile={handleFile('raw')}
        />
      </div>

      {upload ? <ValidationPanel key={`${upload.file.name}-${upload.mode}`} file={upload.file} mode={upload.mode} /> : null}

      <RecentDatasets />
    </div>
  )
}
