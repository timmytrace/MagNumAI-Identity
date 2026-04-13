'use client'
import { useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import type { User } from '@/types'
import { Users, Shield, UserX, UserCheck } from 'lucide-react'
import { format } from 'date-fns'

interface UserWithCreatedAt extends User {
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithCreatedAt[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    const res = await usersApi.list()
    setUsers(res.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleActive = async (user: UserWithCreatedAt) => {
    await usersApi.update(user.id, { is_active: !user.is_active })
    await fetchUsers()
  }

  const toggleAdmin = async (user: UserWithCreatedAt) => {
    await usersApi.update(user.id, { is_admin: !user.is_admin })
    await fetchUsers()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-600/20 border border-purple-500/15 flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-gray-500 text-sm">Manage platform users and permissions</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">User</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Status</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Role</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Joined</th>
              <th className="text-left py-3.5 px-5 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500/30 border-t-purple-500" />
                    <span className="text-gray-500 text-xs">Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.04] table-row-hover">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400/20 to-brand-600/20 border border-brand-500/15 flex items-center justify-center">
                        <span className="text-brand-400 text-xs font-bold">{(user.full_name || user.email)[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.full_name || '—'}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${user.is_active ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/15' : 'bg-gray-500/12 text-gray-400 border border-gray-500/15'}`}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${user.is_admin ? 'bg-purple-500/12 text-purple-400 border border-purple-500/15' : 'bg-gray-500/12 text-gray-400 border border-gray-500/15'}`}>
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-gray-500 font-mono text-xs">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleActive(user)}
                        title={user.is_active ? 'Disable user' : 'Enable user'}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-yellow-500/10 flex items-center justify-center text-gray-500 hover:text-yellow-400 transition-colors"
                      >
                        {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => toggleAdmin(user)}
                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-purple-500/10 flex items-center justify-center text-gray-500 hover:text-purple-400 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
