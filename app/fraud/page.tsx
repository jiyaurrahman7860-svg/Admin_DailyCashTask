'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  ShieldAlert, 
  Ghost,
  UserX, 
  Flag,
  CheckCircle,
  AlertTriangle,
  Monitor,
  MapPin,
  Clock,
  Ban,
  UserCheck,
  Activity,
  BarChart3,
  Eye,
  Search,
  AlertCircle,
  Smartphone,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

interface GhostFraudLog {
  id: string
  userId: string
  userEmail?: string
  userName?: string
  userStatus?: string
  fraudScore?: number
  taskId?: string
  provider?: string
  transactionId?: string
  reason: string
  ipAddress?: string
  deviceFingerprint?: string
  userAgent?: string
  metadata?: any
  status: 'pending_review' | 'confirmed_fraud' | 'false_positive' | 'resolved'
  createdAt: Timestamp
  updatedAt?: Timestamp
}

interface FraudStats {
  total: number
  pending: number
  confirmed: number
  resolved: number
}

const FRAUD_REASONS: { [key: string]: { label: string; color: string; icon: any } } = {
  'GHOST_TASK_NO_START_RECORD': { 
    label: 'Ghost Task', 
    color: 'bg-red-100 text-red-700', 
    icon: Ghost 
  },
  'INVALID_POSTBACK_SIGNATURE': { 
    label: 'Invalid Signature', 
    color: 'bg-red-100 text-red-700', 
    icon: AlertCircle 
  },
  'TASK_COMPLETED_TOO_FAST': { 
    label: 'Too Fast Completion', 
    color: 'bg-orange-100 text-orange-700', 
    icon: Clock 
  },
  'EXCESSIVE_TASK_COMPLETION_RATE': { 
    label: 'Excessive Rate', 
    color: 'bg-yellow-100 text-yellow-700', 
    icon: Activity 
  },
  'DUPLICATE_TRANSACTION': { 
    label: 'Duplicate Transaction', 
    color: 'bg-orange-100 text-orange-700', 
    icon: RefreshCw 
  },
  'MULTIPLE_ACCOUNTS_SAME_DEVICE': { 
    label: 'Device Farm', 
    color: 'bg-purple-100 text-purple-700', 
    icon: Smartphone 
  },
  'MULTIPLE_ACCOUNTS_SAME_IP': { 
    label: 'IP Farm', 
    color: 'bg-blue-100 text-blue-700', 
    icon: MapPin 
  },
  'BLOCKED_USER_ATTEMPT': { 
    label: 'Blocked User Attempt', 
    color: 'bg-gray-100 text-gray-700', 
    icon: Ban 
  },
  'USER_NOT_FOUND': { 
    label: 'User Not Found', 
    color: 'bg-gray-100 text-gray-700', 
    icon: UserX 
  },
  'MISSING_PARAMETERS': { 
    label: 'Missing Parameters', 
    color: 'bg-gray-100 text-gray-700', 
    icon: AlertTriangle 
  }
}

const STATUS_CONFIG: { [key: string]: { label: string; color: string } } = {
  'pending_review': { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700' },
  'confirmed_fraud': { label: 'Confirmed Fraud', color: 'bg-red-100 text-red-700' },
  'false_positive': { label: 'False Positive', color: 'bg-green-100 text-green-700' },
  'resolved': { label: 'Resolved', color: 'bg-blue-100 text-blue-700' }
}

export default function GhostFraudMonitorPage() {
  const router = useRouter()
  const [fraudLogs, setFraudLogs] = useState<GhostFraudLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FraudStats>({ total: 0, pending: 0, confirmed: 0, resolved: 0 })
  const [selectedLog, setSelectedLog] = useState<GhostFraudLog | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Check admin role
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.data()?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // Subscribe to ghost fraud logs
      const q = query(collection(db, 'ghost_fraud_logs'), orderBy('createdAt', 'desc'))
      
      const unsubscribeLogs = onSnapshot(q, async (snapshot) => {
        const logsPromises = snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data()
          // Get user details
          let userData = null
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId))
            userData = userDoc.data()
          } catch (e) {
            // User may not exist
          }
          
          return {
            id: docSnap.id,
            ...data,
            userEmail: userData?.email || data.userEmail || 'Unknown',
            userName: userData?.name || data.userName || 'Unknown',
            userStatus: userData?.status || data.userStatus || 'active',
            fraudScore: userData?.fraudScore || data.fraudScore || 0,
          } as GhostFraudLog
        })
        
        const logs = await Promise.all(logsPromises)
        setFraudLogs(logs)
        
        // Calculate stats
        const stats = {
          total: logs.length,
          pending: logs.filter(l => l.status === 'pending_review').length,
          confirmed: logs.filter(l => l.status === 'confirmed_fraud').length,
          resolved: logs.filter(l => l.status === 'resolved' || l.status === 'false_positive').length
        }
        setStats(stats)
        setLoading(false)
      })

      return () => unsubscribeLogs()
    })

    return () => unsubscribe()
  }, [router])

  const updateLogStatus = async (logId: string, newStatus: string) => {
    try {
      const logRef = doc(db, 'ghost_fraud_logs', logId)
      await updateDoc(logRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating log status:', error)
    }
  }

  const handleUserAction = async (userId: string, action: 'ban' | 'unban') => {
    try {
      const userRef = doc(db, 'users', userId)
      const updates: any = {
        updatedAt: Timestamp.now()
      }

      if (action === 'ban') {
        updates.status = 'banned'
      } else if (action === 'unban') {
        updates.status = 'active'
        updates.flagged = false
      }

      await updateDoc(userRef, updates)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const getReasonBadge = (reason: string) => {
    const config = FRAUD_REASONS[reason] || { 
      label: reason, 
      color: 'bg-gray-100 text-gray-700', 
      icon: AlertTriangle 
    }
    const Icon = config.icon
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const filteredLogs = fraudLogs.filter(log => {
    // Status filter
    if (filterStatus === 'pending') return log.status === 'pending_review'
    if (filterStatus === 'confirmed') return log.status === 'confirmed_fraud'
    if (filterStatus === 'resolved') return log.status === 'resolved' || log.status === 'false_positive'
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        log.userId.toLowerCase().includes(search) ||
        (log.userEmail?.toLowerCase() || '').includes(search) ||
        log.reason.toLowerCase().includes(search) ||
        (log.ipAddress || '').toLowerCase().includes(search)
      )
    }
    
    return true
  })

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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                  <ShieldAlert className="w-8 h-8 text-red-600" />
                  Ghost Fraud Monitor
                </h1>
                <p className="text-gray-500">Monitor and manage suspicious activities</p>
              </div>
              <div className="flex gap-2">
                <div className="bg-white px-4 py-2 rounded-lg border">
                  <span className="text-sm text-gray-500">Total: </span>
                  <span className="font-semibold">{stats.total}</span>
                </div>
                <div className="bg-yellow-50 px-4 py-2 rounded-lg border">
                  <span className="text-sm text-gray-500">Pending: </span>
                  <span className="font-semibold text-yellow-600">{stats.pending}</span>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-lg border">
                  <span className="text-sm text-gray-500">Confirmed: </span>
                  <span className="font-semibold text-red-600">{stats.confirmed}</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by user ID, email, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-auto" defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fraud Logs List */}
              <div className="lg:col-span-2 space-y-4">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className={`overflow-hidden ${selectedLog?.id === log.id ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {getReasonBadge(log.reason)}
                          {getStatusBadge(log.status)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {log.createdAt?.toDate ? 
                            format(log.createdAt.toDate(), 'MMM d, yyyy h:mm a') :
                            'Unknown date'
                          }
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div>
                            <p className="text-sm text-gray-500">User ID</p>
                            <p className="font-mono text-sm">{log.userId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{log.userEmail}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">User Status</p>
                            <Badge className={log.userStatus === 'banned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                              {log.userStatus || 'active'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Fraud Score</p>
                            <Badge className={log.fraudScore && log.fraudScore >= 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                              {log.fraudScore || 0}
                            </Badge>
                          </div>
                        </div>

                        {(log.ipAddress || log.deviceFingerprint) && (
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                            {log.ipAddress && (
                              <div>
                                <p className="text-sm text-gray-500">IP Address</p>
                                <p className="font-mono text-sm">{log.ipAddress}</p>
                              </div>
                            )}
                            {log.deviceFingerprint && (
                              <div>
                                <p className="text-sm text-gray-500">Device Fingerprint</p>
                                <p className="font-mono text-xs truncate">{log.deviceFingerprint}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {selectedLog?.id === log.id ? 'Hide Details' : 'View Details'}
                          </Button>
                          
                          {log.status === 'pending_review' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateLogStatus(log.id, 'false_positive')}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Safe
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateLogStatus(log.id, 'confirmed_fraud')}
                                className="text-red-600"
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                Confirm Fraud
                              </Button>
                            </>
                          )}
                          
                          {log.userStatus !== 'banned' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserAction(log.userId, 'ban')}
                              className="text-red-600"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Ban User
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserAction(log.userId, 'unban')}
                              className="text-green-600"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Unban User
                            </Button>
                          )}
                        </div>

                        {/* Expanded Details */}
                        {selectedLog?.id === log.id && log.metadata && (
                          <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">Fraud Details</h4>
                            <pre className="text-xs text-blue-800 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {filteredLogs.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-lg border">
                    <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No fraud alerts found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm ? 'Try adjusting your search' : 'System is clean'}
                    </p>
                  </div>
                )}
              </div>

              {/* Details Panel */}
              <div>
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Fraud Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                          <p className="text-xs text-gray-500">Total Alerts</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                          <p className="text-xs text-gray-500">Pending</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-red-700">{stats.confirmed}</p>
                          <p className="text-xs text-gray-500">Confirmed</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
                          <p className="text-xs text-gray-500">Resolved</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Top Fraud Reasons</h4>
                        <div className="space-y-2">
                          {Object.entries(
                            fraudLogs.reduce((acc, log) => {
                              acc[log.reason] = (acc[log.reason] || 0) + 1
                              return acc
                            }, {} as Record<string, number>)
                          )
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([reason, count]) => (
                              <div key={reason} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">
                                  {FRAUD_REASONS[reason]?.label || reason}
                                </span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedLog && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Log Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-gray-500">Log ID</p>
                          <p className="font-mono text-xs">{selectedLog.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Provider</p>
                          <p>{selectedLog.provider || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Transaction ID</p>
                          <p className="font-mono text-xs">{selectedLog.transactionId || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Task ID</p>
                          <p className="font-mono text-xs">{selectedLog.taskId || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
