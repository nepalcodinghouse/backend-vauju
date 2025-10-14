import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ManageUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})

  const token = useMemo(() => localStorage.getItem("adminToken"), [])

  useEffect(() => {
    if (!token) return navigate('/admin/login')
    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://backend-vauju-1.onrender.com/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
          headers: { 'x-admin-token': token }, signal: controller.signal
        })
        const data = await res.json()
        if (Array.isArray(data)) setUsers(data)
      } catch {}
      setLoading(false)
    }
    run()
    return () => controller.abort()
  }, [q, token, navigate])

  const doDelete = async (id) => {
    if (!confirm('Delete this user?')) return
    setBusy(x => ({ ...x, [id]: true }))
    try {
      const res = await fetch(`http://localhost:5000/admin/users/${id}`, {
        method: 'DELETE', headers: { 'x-admin-token': token }
      })
      if (res.ok) setUsers(list => list.filter(u => String(u._id) !== String(id)))
    } finally { setBusy(x => ({ ...x, [id]: false })) }
  }

  const toggleVerify = async (id, next) => {
    setBusy(x => ({ ...x, [id]: true }))
    try {
      const res = await fetch(`http://localhost:5000/admin/verify/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ verified: next })
      })
      const data = await res.json()
      if (res.ok && data && data._id) setUsers(list => list.map(u => u._id === id ? data : u))
    } finally { setBusy(x => ({ ...x, [id]: false })) }
  }

  const toggleSuspend = async (id, next) => {
    setBusy(x => ({ ...x, [id]: true }))
    try {
      const res = await fetch(`http://localhost:5000/admin/suspend/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ suspended: next })
      })
      const data = await res.json()
      if (res.ok && data && data._id) setUsers(list => list.map(u => u._id === id ? data : u))
    } finally { setBusy(x => ({ ...x, [id]: false })) }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email" className="border p-2 rounded flex-1" />
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Verified</th>
                <th className="p-2 text-left">Visible</th>
                <th className="p-2 text-left">Approved</th>
                <th className="p-2 text-left">Suspended</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-t">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.isVerified ? 'Yes' : 'No'}</td>
                  <td className="p-2">{u.visible ? 'On' : 'Off'}</td>
                  <td className="p-2">{u.visibilityApproved ? 'Yes' : (u.visibilityRequested ? 'Requested' : 'No')}</td>
                  <td className="p-2">{u.suspended ? 'Yes' : 'No'}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => toggleVerify(u._id, !u.isVerified)} disabled={!!busy[u._id]} className="px-2 py-1 bg-blue-600 text-white rounded">
                      {u.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                    <button onClick={() => toggleSuspend(u._id, !u.suspended)} disabled={!!busy[u._id]} className="px-2 py-1 bg-yellow-600 text-white rounded">
                      {u.suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button onClick={() => doDelete(u._id)} disabled={!!busy[u._id]} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ManageUsers;