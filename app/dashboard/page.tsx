'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Users, Wallet, CheckCircle, Clock, TrendingUp, DollarSign } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayout: 0,
    pendingWithdrawals: 0,
    tasksCompleted: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        setStats(prev => ({ ...prev, totalUsers: snapshot.size }))
      })

      const withdrawalsUnsub = onSnapshot(
        query(collection(db, 'withdrawals'), where('status', '==', 'pending')),
        (snapshot) => {
          setStats(prev => ({ ...prev, pendingWithdrawals: snapshot.size }))
        }
      )

      const transactionsUnsub = onSnapshot(collection(db, 'transactions'), (snapshot) => {
        let total = 0
        let tasks = 0
        snapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.status === 'completed' && data.amount > 0) {
            total += data.amount
          }
          if (data.type === 'task' && data.status === 'completed') {
            tasks++
          }
        })
        setStats(prev => ({ ...prev, totalPayout: total, tasksCompleted: tasks }))
        setLoading(false)
      })

      return () => {
        usersUnsub()
        withdrawalsUnsub()
        transactionsUnsub()
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-black">Admin Dashboard</h1>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payout</p>
                      <p className="text-2xl font-bold">₹{stats.totalPayout}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Withdrawals</p>
                      <p className="text-2xl font-bold">{stats.pendingWithdrawals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tasks Completed</p>
                      <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => router.push('/users')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => router.push('/tasks')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Manage Tasks
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => router.push('/withdrawals')}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Pending Withdrawals
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Platform Overview</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Average Earnings/User</span>
                      <span className="font-semibold">
                        ₹{stats.totalUsers > 0 ? Math.round(stats.totalPayout / stats.totalUsers) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Conversion Rate</span>
                      <span className="font-semibold text-green-600">85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Active Today</span>
                      <span className="font-semibold">{Math.round(stats.totalUsers * 0.6)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
