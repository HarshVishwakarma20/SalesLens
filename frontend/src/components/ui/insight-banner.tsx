import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightBannerProps {
    children: React.ReactNode
    className?: string
}

export function InsightBanner({ children, className }: InsightBannerProps) {
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-[10px] border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-foreground',
                className,
            )}
        >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span className="leading-relaxed">{children}</span>
        </div>
    )
}
