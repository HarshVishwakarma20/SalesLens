import { Info } from 'lucide-react'

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="text-faint transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-max max-w-56 rounded-lg border border-border bg-raised px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
