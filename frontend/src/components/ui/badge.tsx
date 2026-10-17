import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap', {
  variants: {
    tone: {
      accent: 'border-accent/40 bg-accent/10 text-accent',
      info: 'border-accent-2/40 bg-accent-2/10 text-accent-2',
      positive: 'border-positive/40 bg-positive/10 text-positive',
      negative: 'border-negative/40 bg-negative/10 text-negative',
      warning: 'border-warning/40 bg-warning/10 text-warning',
      neutral: 'border-border bg-raised text-muted-foreground',
    },
    size: {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-2.5 py-0.5 text-xs',
    },
  },
  defaultVariants: { tone: 'accent', size: 'sm' },
})

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
