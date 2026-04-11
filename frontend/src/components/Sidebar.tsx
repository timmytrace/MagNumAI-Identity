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
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">MagNumAI</p>
          <p className="text-gray-500 text-xs mt-0.5">Security Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
