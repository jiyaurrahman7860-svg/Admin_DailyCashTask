'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { 
  Users, Search, TrendingUp, Wallet, Crown, ArrowLeft, 
  IndianRupee, Calendar, UserCheck, RefreshCw, Download,
  ChevronRight, ChevronLeft, AlertCircle
} from 'lucide-react'
import { getAdminReferralStats, getUserReferralChain, manualCalculateCommissions } from '@/lib/firebase/functions'
import toast from 'react-hot-toast'

interface TopReferrer {
  userId: string
  displayId: string
  name: string
  email: string
  referralCount: number
  totalReferralEarnings: number
  level: number
}

interface RecentCommission {
  id: string
  referrerId: string
  referrerName: string
  referrerEmail: string
  referredUserId: string
  referredUserName: string
  referredUserEmail: string
  earningsAmount: number
  commissionAmount: number
  commissionRate: number
  calculationDate: string
  status: string
  transactionId?: string
}

interface ReferralOverview {
  totalReferralRelationships: number
  totalCommissionsPaid: number
  totalCommissionAmount: number
  averageCommissionPerReferral: number
}

interface ReferralChainUser {
  userId: string
  displayId: string
  name: string
  email: string
  referralCode: string
  level: number
  referralCount: number
  totalEarned: number
  walletBalance: number
  joinedAt: string
}

interface ReferralChainReferredUser {
  userId: string
  displayId: string
  name: string
  email: string
  joinedAt: string
  totalCommissionEarned: number
  theirReferralCount: number
  status: string
}

interface ReferralChainData {
  user: ReferralChainUser
  referrer: { userId: string; name: string; email: string; referralCode: string } | null
  referredUsers: ReferralChainReferredUser[]
  commissionStats: {
    totalEarnedAsReferrer: number
    totalPaidToReferrer: number
  }
}

export default function AdminReferralPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<ReferralOverview | null>(null)
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [recentCommissions, setRecentCommissions] = useState<RecentCommission[]>([])
  const [dailyCommissions, setDailyCommissions] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<ReferralChainData | null>(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }
      
      // Check if admin
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await fetchReferralStats()
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const fetchReferralStats = async () => {
    try {
      const result = await getAdminReferralStats() as any
      if (result.data?.success) {
        setOverview(result.data.overview)
        setTopReferrers(result.data.topReferrers)
        setRecentCommissions(result.data.recentCommissions)
        setDailyCommissions(result.data.dailyCommissions)
      }
    } catch (error) {
      console.error('Error fetching admin referral stats:', error)
      toast.error('Failed to load referral statistics')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a user ID')
      return
    }

    setLoading(true)
    try {
      const result = await getUserReferralChain({ userId: searchQuery.trim() }) as any
      if (result.data?.success) {
        setSelectedUser(result.data)
        toast.success('User referral chain loaded')
      } else {
        toast.error('User not found')
      }
    } catch (error) {
      console.error('Error fetching user referral chain:', error)
      toast.error('Failed to load user referral chain')
    }
    setLoading(false)
  }

  const handleManualCalculate = async () => {
    setCalculating(true)
    try {
      const result = await manualCalculateCommissions() as any
      if (result.data?.success) {
        toast.success(`Commission calculation completed: ${result.data.processed} referrals processed, ₹${result.data.totalCommissionPaid} paid`)
        await fetchReferralStats()
      }
    } catch (error) {
      console.error('Error calculating commissions:', error)
      toast.error('Failed to calculate commissions')
    }
    setCalculating(false)
  }

  const exportData = () => {
    const data = {
      overview,
      topReferrers,
      recentCommissions,
      dailyCommissions,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `referral-stats-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Data exported successfully')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => setSelectedUser(null)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>

              {/* User Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Referral Chain: {selectedUser.user.name}
                </h1>
                <p className="text-gray-500">User ID: {selectedUser.user.displayId}</p>
              </div>

              {/* User Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Referral Code</p>
                    <p className="text-lg font-bold">{selectedUser.user.referralCode}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Level</p>
                    <p className="text-lg font-bold">{selectedUser.user.level}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Total Referrals</p>
                    <p className="text-lg font-bold">{selectedUser.user.referralCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Total Earned</p>
                    <p className="text-lg font-bold text-green-600">₹{selectedUser.user.totalEarned.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Commission Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">Earned as Referrer</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      ₹{selectedUser.commissionStats.totalEarnedAsReferrer.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold">Paid to Their Referrer</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      ₹{selectedUser.commissionStats.totalPaidToReferrer.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Referrer Info */}
              {selectedUser.referrer && (
                <Card className="mb-6 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      Referrer (Who referred this user)
                    </h3>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">{selectedUser.referrer.name}</p>
                        <p className="text-sm text-gray-500">{selectedUser.referrer.email}</p>
                        <p className="text-xs text-gray-400">Code: {selectedUser.referrer.referralCode}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery(selectedUser.referrer!.userId)
                          handleSearch()
                        }}
                      >
                        View Chain
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Referred Users */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Users Referred by {selectedUser.user.name} ({selectedUser.referredUsers.length})
                  </h3>
                  
                  {selectedUser.referredUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No referred users yet</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedUser.referredUsers.map((ref) => (
                        <div key={ref.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{ref.name}</p>
                            <p className="text-sm text-gray-500">{ref.email}</p>
                            <p className="text-xs text-gray-400">
                              ID: {ref.displayId} • Joined: {new Date(ref.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              Commission: ₹{ref.totalCommissionEarned.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Their referrals: {ref.theirReferralCount}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setSearchQuery(ref.userId)
                                handleSearch()
                              }}
                            >
                              View Chain
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black flex items-center">
                <Users className="w-6 h-6 mr-2" />
                Referral System Monitor
              </h1>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={exportData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={handleManualCalculate}
                  disabled={calculating}
                  className="bg-primary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
                  {calculating ? 'Calculating...' : 'Run Commission Calculation'}
                </Button>
              </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Referrals</p>
                      <p className="text-xl font-bold">{overview?.totalReferralRelationships || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Commission</p>
                      <p className="text-xl font-bold text-green-600">₹{overview?.totalCommissionAmount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Commissions Paid</p>
                      <p className="text-xl font-bold">{overview?.totalCommissionsPaid || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg per Referral</p>
                      <p className="text-xl font-bold">₹{overview?.averageCommissionPerReferral?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search User */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Search User Referral Chain
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter User ID or Firebase UID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Top Referrers */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Top Referrers
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Rank</th>
                        <th className="text-left py-2 px-3">User</th>
                        <th className="text-left py-2 px-3">Referrals</th>
                        <th className="text-left py-2 px-3">Commission Earned</th>
                        <th className="text-left py-2 px-3">Level</th>
                        <th className="text-left py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topReferrers.map((referrer, index) => (
                        <tr key={referrer.userId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium">{referrer.name}</p>
                              <p className="text-xs text-gray-500">{referrer.email}</p>
                              <p className="text-xs text-gray-400">ID: {referrer.displayId}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3">{referrer.referralCount}</td>
                          <td className="py-3 px-3 font-medium text-green-600">
                            ₹{referrer.totalReferralEarnings.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              Level {referrer.level}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchQuery(referrer.userId)
                                handleSearch()
                              }}
                            >
                              View Chain
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Commissions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Recent Commissions
                </h3>
                <div className="space-y-3">
                  {recentCommissions.slice(0, 10).map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <IndianRupee className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {commission.referrerName} → {commission.referredUserName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(commission.calculationDate).toLocaleString()} • 
                            Base: ₹{commission.earningsAmount.toFixed(2)} • 
                            Rate: {(commission.commissionRate * 100).toFixed(0)}%
                          </p>
                          {commission.transactionId && (
                            <p className="text-xs text-gray-400">TX: {commission.transactionId}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          +₹{commission.commissionAmount.toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          commission.status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {commission.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
