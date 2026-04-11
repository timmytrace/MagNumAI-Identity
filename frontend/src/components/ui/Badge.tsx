import clsx from 'clsx'

interface BadgeProps {
  variant: 'low' | 'medium' | 'high' | 'critical' | 'allowed' | 'blocked' | 'sanitized' | 'flagged'
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeProps['variant'], string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  allowed: 'bg-emerald-500/20 text-emerald-400',
  blocked: 'bg-red-500/20 text-red-400',
  sanitized: 'bg-blue-500/20 text-blue-400',
  flagged: 'bg-yellow-500/20 text-yellow-400',
}

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
