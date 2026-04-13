'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ScrollText,
  ShieldOff,
  Key,
  Settings,
  Users,
  LogOut,
  ShieldCheck,
  Activity,
  ChevronRight,
} from 'lucide-react'
import Cookies from 'js-cookie'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/logs', label: 'Interaction Logs', icon: ScrollText },
  { href: '/dashboard/blocked', label: 'Blocked Requests', icon: ShieldOff },
  { href: '/dashboard/analytics', label: 'Risk Analytics', icon: Activity },
  { href: '/dashboard/policies', label: 'Security Policies', icon: Settings },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/users', label: 'Users', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    router.push('/login')
  }

  return (
    <aside className="w-[270px] min-h-screen bg-surface-100/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow-blue">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none tracking-wide">MagNumAI</p>
          <p className="text-brand-400/70 text-[11px] mt-0.5 font-medium tracking-wider uppercase">Security Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="px-3 pt-2 pb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Main Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200',
                active
                  ? 'bg-brand-500/10 text-brand-400 shadow-sm border border-brand-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              )}
            >
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                active ? 'bg-brand-500/20' : 'bg-white/[0.04] group-hover:bg-white/[0.06]'
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-brand-400/50" />}
            </Link>
          )
        })}
      </nav>

      {/* Status indicator */}
      <div className="mx-4 mb-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="text-emerald-400 text-xs font-medium">Gateway Active</span>
        </div>
        <p className="text-emerald-400/50 text-[10px] mt-1 pl-[18px]">All systems operational</p>
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          Sign out
        </button>
      </div>
    </aside>
  )
}
