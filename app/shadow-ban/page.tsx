'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, Timestamp, limit, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  EyeOff, 
  Eye, 
  UserX, 
  UserCheck,
  Ban,
  AlertTriangle,
  Search,
  RefreshCw,
  ShieldAlert,
  Wallet,
  Gift,
  Users,
  ArrowRightLeft
} from 'lucide-react'
import { format } from 'date-fns'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/config'

interface ShadowBannedUser {
  id: string
  name: string
  email: string
  userId: string
  walletBalance: number
  isShadowBanned: boolean
  shadowBanReason?: string
  shadowBannedAt?: Timestamp
  shadowBannedBy?: string
  blockedRewards: number
  blockedWithdrawals: number
  blockedReferrals: number
  lastActivity: Timestamp
}

interface ShadowActivityLog {
  id: string
  userId: string
  activityType: 'blocked_task_reward' | 'blocked_withdraw' | 'blocked_referral' | 'blocked_bonus' | 'blocked_offerwall'
  taskId?: string
  rewardAttempted: number
  ipAddress?: string
  deviceFingerprint?: string
  reason?: string
  createdAt: Timestamp
}

export default function ShadowBanMonitorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [shadowBannedUsers, setShadowBannedUsers] = useState<ShadowBannedUser[]>([])
  const [activityLogs, setActivityLogs] = useState<ShadowActivityLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<ShadowBannedUser | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.data()?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setIsAdmin(true)

      // Subscribe to shadow banned users
      const usersQuery = query(
        collection(db, 'users'),
        where('isShadowBanned', '==', true),
        orderBy('shadowBannedAt', 'desc')
      )

      const unsubscribeUsers = onSnapshot(usersQuery, async (snapshot) => {
        const users: ShadowBannedUser[] = []
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          
          // Count blocked activities for this user
          const logsQuery = query(
            collection(db, 'shadow_activity_logs'),
            where('userId', '==', docSnap.id)
          )
          const logsSnapshot = await getDocs(logsQuery)
          
          let blockedRewards = 0
          let blockedWithdrawals = 0
          let blockedReferrals = 0
          
          logsSnapshot.forEach((log: { data: () => any }) => {
            const logData = log.data()
            switch (logData.activityType) {
              case 'blocked_task_reward':
              case 'blocked_offerwall':
              case 'blocked_bonus':
                blockedRewards++
                break
              case 'blocked_withdraw':
                blockedWithdrawals++
                break
              case 'blocked_referral':
                blockedReferrals++
                break
            }
          })
          
          users.push({
            id: docSnap.id,
            name: data.name || 'Unknown',
            email: data.email || 'N/A',
            userId: data.userId || docSnap.id,
            walletBalance: data.walletBalance || 0,
            isShadowBanned: true,
            shadowBanReason: data.shadowBanReason,
            shadowBannedAt: data.shadowBannedAt,
            shadowBannedBy: data.shadowBannedBy,
            blockedRewards,
            blockedWithdrawals,
            blockedReferrals,
            lastActivity: data.lastActivity || data.shadowBannedAt || data.updatedAt
          })
        }
        
        setShadowBannedUsers(users)
        setLoading(false)
      })

      // Subscribe to recent activity logs
      const logsQuery = query(
        collection(db, 'shadow_activity_logs'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )

      const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const logs: ShadowActivityLog[] = []
        snapshot.forEach(doc => {
          const data = doc.data()
          logs.push({
            id: doc.id,
            userId: data.userId,
            activityType: data.activityType,
            taskId: data.taskId,
            rewardAttempted: data.rewardAttempted || 0,
            ipAddress: data.ipAddress,
            deviceFingerprint: data.deviceFingerprint,
            reason: data.reason,
            createdAt: data.createdAt
          })
        })
        setActivityLogs(logs)
      })

      return () => {
        unsubscribeUsers()
        unsubscribeLogs()
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleRemoveShadowBan = async (userId: string) => {
    setProcessingAction(userId)
    try {
      const removeShadowBanFn = httpsCallable(functions, 'removeShadowBan')
      await removeShadowBanFn({ userId })
    } catch (error) {
      console.error('Error removing shadow ban:', error)
      alert('Failed to remove shadow ban')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleConvertToFullBan = async (userId: string) => {
    if (!confirm('Are you sure you want to convert this to a full ban? The user will be completely blocked.')) {
      return
    }
    
    setProcessingAction(userId)
    try {
      // First remove shadow ban
      const removeShadowBanFn = httpsCallable(functions, 'removeShadowBan')
      await removeShadowBanFn({ userId })
      
      // Then apply full ban (block the user)
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        isBlocked: true,
        blockedAt: Timestamp.now(),
        blockedReason: 'Converted from shadow ban to full ban'
      })
    } catch (error) {
      console.error('Error converting to full ban:', error)
      alert('Failed to convert to full ban')
    } finally {
      setProcessingAction(null)
    }
  }

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'blocked_task_reward':
      case 'blocked_offerwall':
        return <Wallet className="w-4 h-4 text-orange-500" />
      case 'blocked_withdraw':
        return <ArrowRightLeft className="w-4 h-4 text-red-500" />
      case 'blocked_referral':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'blocked_bonus':
        return <Gift className="w-4 h-4 text-purple-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'blocked_task_reward':
        return 'Blocked Task Reward'
      case 'blocked_offerwall':
        return 'Blocked Offerwall Reward'
      case 'blocked_withdraw':
        return 'Blocked Withdrawal'
      case 'blocked_referral':
        return 'Blocked Referral'
      case 'blocked_bonus':
        return 'Blocked Bonus'
      default:
        return 'Blocked Activity'
    }
  }

  const filteredUsers = shadowBannedUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.userId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalBlockedRewards = shadowBannedUsers.reduce((sum, user) => sum + user.blockedRewards, 0)
  const totalBlockedWithdrawals = shadowBannedUsers.reduce((sum, user) => sum + user.blockedWithdrawals, 0)
  const totalBlockedReferrals = shadowBannedUsers.reduce((sum, user) => sum + user.blockedReferrals, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Access denied. Admin only.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                  <EyeOff className="w-8 h-8 text-red-600" />
                  Shadow Ban Monitor
                </h1>
                <p className="text-gray-500">Silently restrict suspicious users without visible ban messages</p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-red-100 text-red-700 text-sm">
                  Shadow Banned: {shadowBannedUsers.length}
                </Badge>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shadow Banned Users</p>
                      <p className="text-2xl font-bold">{shadowBannedUsers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Blocked Rewards</p>
                      <p className="text-2xl font-bold">{totalBlockedRewards}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Blocked Withdrawals</p>
                      <p className="text-2xl font-bold">{totalBlockedWithdrawals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Blocked Referrals</p>
                      <p className="text-2xl font-bold">{totalBlockedReferrals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, or user ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shadow Banned Users */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  Shadow Banned Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="p-4 border border-red-200 bg-red-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <EyeOff className="w-4 h-4 text-red-600" />
                            <span className="font-semibold text-gray-900">{user.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {user.userId}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                            <span>Wallet: ₹{user.walletBalance}</span>
                            <span>Banned: {user.shadowBannedAt ? format(user.shadowBannedAt.toDate(), 'MMM d, yyyy h:mm a') : 'Unknown'}</span>
                          </div>
                          
                          <p className="text-sm text-red-600 mb-2">
                            <strong>Reason:</strong> {user.shadowBanReason}
                          </p>
                          
                          <div className="flex gap-2 mt-3">
                            <Badge variant="outline" className="text-xs bg-orange-50">
                              Blocked Rewards: {user.blockedRewards}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              Blocked Withdrawals: {user.blockedWithdrawals}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-purple-50">
                              Blocked Referrals: {user.blockedReferrals}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveShadowBan(user.id)}
                            disabled={processingAction === user.id}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Remove Ban
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertToFullBan(user.id)}
                            disabled={processingAction === user.id}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Full Ban
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <EyeOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>No shadow banned users found</p>
                      {searchQuery && (
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  Recent Blocked Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {activityLogs.slice(0, 50).map((log: ShadowActivityLog) => (
                    <div 
                      key={log.id}
                      className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getActivityTypeIcon(log.activityType)}
                        <div>
                          <p className="text-sm font-medium">{getActivityTypeLabel(log.activityType)}</p>
                          <p className="text-xs text-gray-500">
                            User: {log.userId.substring(0, 8)}... | 
                            Reward: ₹{log.rewardAttempted} |
                            {format(log.createdAt.toDate(), 'MMM d, h:mm a')}
                          </p>
                          {log.reason && (
                            <p className="text-xs text-red-500">{log.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {activityLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm">No blocked activity recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">About Shadow Ban</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Shadow banned users see normal UI and believe they are earning, but all rewards are silently blocked. 
                      This is used for suspicious users where a visible ban might cause them to create new accounts. 
                      All blocked activities are logged for review.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
