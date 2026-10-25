const intFormatter = new Intl.NumberFormat('en-GB')
const gbpFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 })

export function formatGBP(value: number) {
  return gbpFormatter.format(value)
}

export function formatInt(value: number) {
  return intFormatter.format(value)
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`
}

export function formatGBPCompact(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')
    return `${sign}£${formatted}M`
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '')
    return `${sign}£${formatted}k`
  }
  return `${sign}£${abs.toFixed(0)}`
}

export function formatAxisK(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}M`
  return value === 0 ? '0' : `${value}k`
}
