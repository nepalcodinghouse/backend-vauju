import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SuspendUsers() {
  const navigate = useNavigate()
  const token = useMemo(() => localStorage.getItem('adminToken'), [])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return navigate('/admin/login')
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch('https://backend-vauju-1.onrender.com/admin/users', { headers: { 'x-admin-token': token } })
        const data = await res.json()
        if (Array.isArray(data)) setUsers(data)
      } catch {}
      setLoading(false)
    }
    run()
  }, [token, navigate])

  const toggle = async (id, next) => {
    try {
      const res = await fetch(`https://backend-vauju-1.onrender.com/admin/suspend/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ suspended: next })
      })
      const data = await res.json()
      if (res.ok && data && data._id) setUsers(list => list.map(u => u._id === id ? data : u))
    } catch {}
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Suspend Users</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <ul className="space-y-2">
          {users.map(u => (
            <li key={u._id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-sm text-gray-600">{u.email}</div>
              </div>
              <button onClick={() => toggle(u._id, !u.suspended)} className={`px-3 py-1 rounded text-white ${u.suspended ? 'bg-green-600' : 'bg-yellow-600'}`}>
                {u.suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SuspendUsers;