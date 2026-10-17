import { cn } from '@/lib/utils'

interface ChartCardProps {
    title: string
    description?: string
    children: React.ReactNode
    className?: string
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
    return (
        <div className={cn('sl-card flex flex-col gap-2 p-4', className)}>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            <div className="flex-1">{children}</div>
        </div>
    )
}
