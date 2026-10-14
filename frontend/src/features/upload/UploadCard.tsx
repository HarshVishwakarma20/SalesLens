import type { ReactNode } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'
import type { LucideIcon } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UploadCardProps {
  icon: LucideIcon
  dropIcon: LucideIcon
  dropIconClassName?: string
  badge: string
  badgeTone: BadgeProps['tone']
  title: string
  description: string
  dropLabel: string
  dropHint: string
  footer: ReactNode
  accept: Accept
  onFile: (file: File) => void
}

export function UploadCard({
  icon: Icon,
  dropIcon: DropIcon,
  dropIconClassName,
  badge,
  badgeTone,
  title,
  description,
  dropLabel,
  dropHint,
  footer,
  accept,
  onFile,
}: UploadCardProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDrop: (files) => files[0] && onFile(files[0]),
  })

  return (
    <section className="sl-card group flex flex-col justify-between p-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex size-11 items-center justify-center rounded-[10px] bg-accent/15 text-accent">
            <Icon className="size-5" aria-hidden />
          </div>
          <Badge tone={badgeTone} size="md">
            {badge}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{description}</p>
        <div
          {...getRootProps()}
          className={cn(
            'flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-accent/40 p-4 text-center transition-all hover:border-accent hover:bg-accent/[0.08] group-hover:border-accent/70',
            isDragActive && 'border-accent bg-accent/[0.08]',
          )}
        >
          <input {...getInputProps()} aria-label={dropLabel} />
          <DropIcon className={cn('mb-2 size-6 text-accent', dropIconClassName)} aria-hidden />
          <span className="text-xs font-medium text-foreground">{dropLabel}</span>
          <span className="mt-1 text-[11px] text-faint">{dropHint}</span>
        </div>
      </div>
      <div className="mt-4 border-t border-border/60 pt-3 text-xs text-faint">{footer}</div>
    </section>
  )
}
