import clsx from 'clsx'

interface BadgeProps {
  variant: 'low' | 'medium' | 'high' | 'critical' | 'allowed' | 'blocked' | 'sanitized' | 'flagged'
  children: React.ReactNode
  className?: string
  pulse?: boolean
}

const variants: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
  critical: 'bg-red-500/15 text-red-400 border border-red-500/25',
  allowed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  blocked: 'bg-red-500/15 text-red-400 border border-red-500/20',
  sanitized: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  flagged: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
}

const dotColors: Record<string, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-yellow-400',
  high: 'bg-orange-400',
  critical: 'bg-red-400',
  allowed: 'bg-emerald-400',
  blocked: 'bg-red-400',
  sanitized: 'bg-blue-400',
  flagged: 'bg-yellow-400',
}

export default function Badge({ variant, children, className, pulse }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide',
        variants[variant],
        className
      )}
    >
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full',
        dotColors[variant],
        (pulse || variant === 'critical') && 'animate-pulse'
      )} />
      {children}
    </span>
  )
}
