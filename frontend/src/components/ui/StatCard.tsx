import clsx from 'clsx'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'blue' | 'red' | 'yellow' | 'green' | 'orange' | 'purple'
}

const colorConfig = {
  blue: {
    icon: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
    value: 'text-blue-50',
    accent: 'stat-card-blue',
    glow: 'hover:shadow-glow-blue',
  },
  red: {
    icon: 'text-red-400 bg-red-500/15 border-red-500/20',
    value: 'text-red-50',
    accent: 'stat-card-red',
    glow: 'hover:shadow-glow-red',
  },
  yellow: {
    icon: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
    value: 'text-yellow-50',
    accent: 'stat-card-yellow',
    glow: 'hover:shadow-glow-orange',
  },
  green: {
    icon: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
    value: 'text-emerald-50',
    accent: 'stat-card-green',
    glow: 'hover:shadow-glow-green',
  },
  orange: {
    icon: 'text-orange-400 bg-orange-500/15 border-orange-500/20',
    value: 'text-orange-50',
    accent: 'stat-card-orange',
    glow: 'hover:shadow-glow-orange',
  },
  purple: {
    icon: 'text-purple-400 bg-purple-500/15 border-purple-500/20',
    value: 'text-purple-50',
    accent: 'stat-card-purple',
    glow: '',
  },
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
}: StatCardProps) {
  const cfg = colorConfig[color]

  return (
    <div className={clsx('stat-card', cfg.accent, cfg.glow, 'animate-slide-up')}>
      <div className="flex items-start justify-between">
        <div className="pl-3">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className={clsx('text-3xl font-bold mt-2 animate-count-up', cfg.value)}>{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center border', cfg.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
