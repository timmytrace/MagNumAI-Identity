interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'blue' | 'red' | 'yellow' | 'green' | 'orange'
}

const colorMap = {
  blue: 'text-blue-400 bg-blue-500/10',
  red: 'text-red-400 bg-red-500/10',
  yellow: 'text-yellow-400 bg-yellow-500/10',
  green: 'text-emerald-400 bg-emerald-500/10',
  orange: 'text-orange-400 bg-orange-500/10',
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
