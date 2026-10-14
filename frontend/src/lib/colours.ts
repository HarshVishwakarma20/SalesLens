import type { RiskBand, SegmentName } from './types'

export const SEGMENT_COLOURS: Record<SegmentName, string> = {
  Champion: '#F5B83D',
  Loyal: '#14B8A6',
  Promising: '#38BDF8',
  New: '#7AA2F7',
  'At-Risk': '#FB923C',
  Lost: '#EF6B6B',
}

export const RISK_COLOURS: Record<RiskBand, string> = {
  Low: '#2DD4BF',
  Medium: '#FBBF24',
  High: '#FB923C',
  Critical: '#EF4444',
}

export const CHART_COLOURS = {
  sales: '#14B8A6',
  returns: '#F87171',
  returnRate: '#38BDF8',
  net: '#0EA5E9',
  grid: 'rgba(157, 184, 192, 0.08)',
  axis: '#6A8892',
} as const
