'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Users, Wallet, ClipboardList, RefreshCw, Save, TrendingUp } from 'lucide-react'

interface SiteStats {
  totalUsers: number
  totalPaid: number
  availableTasks: number
  totalTasksCompleted: number
  updatedAt?: Timestamp
}

export default function SiteStatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<SiteStats>({
    totalUsers: 0,
    totalPaid: 0,
    availableTasks: 0,
    totalTasksCompleted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }
      loadStats()
    })
    return () => unsubscribe()
  }, [router])

  const loadStats = async () => {
    setLoading(true)
    try {
      const docRef = doc(db, 'site_stats', 'main')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteStats
        setStats(data)
      } else {
        // Initialize with default values
        const defaultStats: SiteStats = {
          totalUsers: 0,
          totalPaid: 0,
          availableTasks: 0,
          totalTasksCompleted: 0,
          updatedAt: Timestamp.now(),
        }
        await setDoc(docRef, defaultStats)
        setStats(defaultStats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      alert('Failed to load site stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const docRef = doc(db, 'site_stats', 'main')
      await setDoc(docRef, {
        ...stats,
        updatedAt: Timestamp.now(),
      })
      alert('Site stats updated successfully')
    } catch (error) {
      console.error('Error saving stats:', error)
      alert('Failed to save site stats')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof SiteStats, value: string) => {
    const numValue = parseInt(value) || 0
    setStats(prev => ({ ...prev, [field]: numValue }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300 p-6">
            <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Statistics</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Control homepage display statistics</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadStats} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Total Users */}
            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.totalUsers?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Total Users
                  </label>
                  <Input
                    type="number"
                    value={stats.totalUsers || 0}
                    onChange={(e) => handleChange('totalUsers', e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Enter total users count"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Total Paid */}
            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mr-4">
                    <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{stats.totalPaid?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Total Paid (₹)
                  </label>
                  <Input
                    type="number"
                    value={stats.totalPaid || 0}
                    onChange={(e) => handleChange('totalPaid', e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Enter total paid amount"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Available Tasks */}
            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mr-4">
                    <ClipboardList className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Available Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.availableTasks?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Available Tasks
                  </label>
                  <Input
                    type="number"
                    value={stats.availableTasks || 0}
                    onChange={(e) => handleChange('availableTasks', e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Enter available tasks count"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Total Tasks Completed */}
            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mr-4">
                    <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.totalTasksCompleted?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Tasks Completed
                  </label>
                  <Input
                    type="number"
                    value={stats.totalTasksCompleted || 0}
                    onChange={(e) => handleChange('totalTasksCompleted', e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Enter tasks completed count"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <Card className="dark:bg-[#1E293B] dark:border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Homepage Preview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                These are the statistics that will be displayed on the homepage:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalUsers?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">₹{stats.totalPaid?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.availableTasks?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Available Tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{stats.totalTasksCompleted?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tasks Completed</p>
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
