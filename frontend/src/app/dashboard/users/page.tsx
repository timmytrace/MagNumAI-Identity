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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm">Manage platform users and permissions</p>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Joined</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto" />
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{user.full_name || '—'}</p>
                      <p className="text-gray-400 text-xs">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${user.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${user.is_admin ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(user)}
                        title={user.is_active ? 'Disable user' : 'Enable user'}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => toggleAdmin(user)}
                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                      >
                        <Shield className="w-4 h-4" />
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
