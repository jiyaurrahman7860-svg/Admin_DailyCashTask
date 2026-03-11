'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '@/lib/firebase/config'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  Ban,
  UserCheck,
  Users,
  Search,
  ShieldAlert,
  Wallet,
  AlertTriangle,
  Clock,
  Lock,
  Unlock,
  History,
  UserX,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

// Helper function to convert Firestore timestamp to Date
function formatFirestoreDate(timestamp: any, formatStr: string = 'MMM d, yyyy h:mm a'): string {
  if (!timestamp) return 'Unknown'
  
  let date: Date
  
  if (typeof timestamp === 'object' && timestamp.toDate) {
    // Firestore Timestamp object
    date = timestamp.toDate()
  } else if (typeof timestamp === 'object' && timestamp._seconds) {
    // Serialized Firestore timestamp
    date = new Date(timestamp._seconds * 1000)
  } else if (typeof timestamp === 'string') {
    // ISO string
    date = new Date(timestamp)
  } else {
    date = new Date(timestamp)
  }
  
  return format(date, formatStr)
}

interface BannedUser {
  id: string
  userId: string
  user: {
    name: string
    email: string
    userId: string
    walletBalance: number
    isBanned: boolean
  }
  bannedBy: string
  reason: string
  bannedAt: any
  unbannedAt?: any
  unbannedBy?: string
  unbanReason?: string
  walletBalanceAtBan?: number
  status: 'active' | 'lifted'
}

interface UserDetails {
  id: string
  user: any
  banHistory: any[]
  recentTransactions: any[]
  recentSubmissions: any[]
}

export default function UserBanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  
  // Ban users list
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  
  // Ban dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banUserId, setBanUserId] = useState('')
  const [banReason, setBanReason] = useState('')
  const [freezeWallet, setFreezeWallet] = useState(true)
  
  // Unban dialog
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false)
  const [selectedBan, setSelectedBan] = useState<BannedUser | null>(null)
  const [unbanReason, setUnbanReason] = useState('')
  const [restoreWallet, setRestoreWallet] = useState(true)
  
  // Bulk ban
  const [bulkBanDialogOpen, setBulkBanDialogOpen] = useState(false)
  const [bulkUserIds, setBulkUserIds] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkFreezeWallet, setBulkFreezeWallet] = useState(true)
  
  // User details
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

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
      fetchBannedUsers()
    })

    return () => unsubscribe()
  }, [router])

  const fetchBannedUsers = async () => {
    try {
      const getBannedUsersFn = httpsCallable(functions, 'getBannedUsers')
      const result = await getBannedUsersFn({ status: 'all', limit: 100 })
      const data = result.data as { bans: BannedUser[] }
      setBannedUsers(data.bans || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching banned users:', error)
      setLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!banUserId || !banReason) return
    
    setProcessingAction('ban')
    try {
      const banUserFn = httpsCallable(functions, 'banUser')
      await banUserFn({ 
        userId: banUserId, 
        reason: banReason,
        freezeWallet 
      })
      setBanDialogOpen(false)
      setBanUserId('')
      setBanReason('')
      fetchBannedUsers()
    } catch (error) {
      console.error('Error banning user:', error)
      alert('Failed to ban user: ' + (error as Error).message)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleUnbanUser = async () => {
    if (!selectedBan) return
    
    setProcessingAction('unban')
    try {
      const unbanUserFn = httpsCallable(functions, 'unbanUser')
      await unbanUserFn({ 
        userId: selectedBan.user.userId || selectedBan.userId, 
        reason: unbanReason,
        restoreWallet
      })
      setUnbanDialogOpen(false)
      setSelectedBan(null)
      setUnbanReason('')
      fetchBannedUsers()
    } catch (error) {
      console.error('Error unbanning user:', error)
      alert('Failed to unban user: ' + (error as Error).message)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleBulkBan = async () => {
    const userIds = bulkUserIds.split('\n').map(id => id.trim()).filter(id => id)
    if (userIds.length === 0 || !bulkReason) return
    
    if (userIds.length > 50) {
      alert('Maximum 50 users can be banned at once')
      return
    }
    
    setProcessingAction('bulk')
    try {
      const bulkBanFn = httpsCallable(functions, 'bulkBanUsers')
      await bulkBanFn({ 
        userIds, 
        reason: bulkReason,
        freezeWallet: bulkFreezeWallet
      })
      setBulkBanDialogOpen(false)
      setBulkUserIds('')
      setBulkReason('')
      fetchBannedUsers()
      alert(`Successfully banned ${userIds.length} users`)
    } catch (error) {
      console.error('Error bulk banning users:', error)
      alert('Failed to bulk ban users: ' + (error as Error).message)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleViewUserDetails = async (userId: string) => {
    setLoadingDetails(true)
    setUserDetailsOpen(true)
    try {
      const getUserDetailsFn = httpsCallable(functions, 'getUserDetails')
      const result = await getUserDetailsFn({ userId })
      setUserDetails(result.data as UserDetails)
    } catch (error) {
      console.error('Error fetching user details:', error)
      alert('Failed to fetch user details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const filteredUsers = bannedUsers.filter(ban => {
    const matchesSearch = 
      ban.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.user?.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.userId?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === 'active') return matchesSearch && ban.status === 'active'
    if (activeTab === 'lifted') return matchesSearch && ban.status === 'lifted'
    return matchesSearch
  })

  const activeBans = bannedUsers.filter(b => b.status === 'active')
  const liftedBans = bannedUsers.filter(b => b.status === 'lifted')

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
                  <Ban className="w-8 h-8 text-red-600" />
                  User Ban Management
                </h1>
                <p className="text-gray-500">Manage user bans, unbans, and view ban history</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBulkBanDialogOpen(true)}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Bulk Ban
                </Button>
                <Button
                  onClick={() => setBanDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Ban User
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Ban className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Bans</p>
                      <p className="text-2xl font-bold">{activeBans.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Lifted Bans</p>
                      <p className="text-2xl font-bold">{liftedBans.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Frozen Balance</p>
                      <p className="text-2xl font-bold">
                        ₹{activeBans.reduce((sum, ban) => sum + (ban.walletBalanceAtBan || 0), 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  Active Bans ({activeBans.length})
                </TabsTrigger>
                <TabsTrigger value="lifted" className="flex items-center gap-2">
                  <Unlock className="w-4 h-4" />
                  Lifted Bans ({liftedBans.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  All History
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      {activeTab === 'active' && 'Active Banned Users'}
                      {activeTab === 'lifted' && 'Lifted Ban Users'}
                      {activeTab === 'all' && 'Ban History'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredUsers.map((ban) => (
                        <div 
                          key={ban.id}
                          className={`p-4 border rounded-lg ${
                            ban.status === 'active' 
                              ? 'border-red-200 bg-red-50' 
                              : 'border-green-200 bg-green-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {ban.status === 'active' ? (
                                  <Ban className="w-4 h-4 text-red-600" />
                                ) : (
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                )}
                                <span className="font-semibold text-gray-900">
                                  {ban.user?.name || 'Unknown'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {ban.user?.userId || ban.userId}
                                </Badge>
                                <Badge 
                                  className={ban.status === 'active' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-green-100 text-green-700'
                                  }
                                >
                                  {ban.status === 'active' ? 'BANNED' : 'LIFTED'}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">{ban.user?.email}</p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                <span>Current Wallet: ₹{ban.user?.walletBalance || 0}</span>
                                {ban.walletBalanceAtBan && ban.walletBalanceAtBan > 0 && (
                                  <span className="text-orange-600">
                                    Frozen at ban: ₹{ban.walletBalanceAtBan}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm text-red-600 mb-2">
                                <strong>Ban Reason:</strong> {ban.reason}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Banned: {formatFirestoreDate(ban.bannedAt)}
                                </span>
                                {ban.unbannedAt && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Unlock className="w-3 h-3" />
                                    Lifted: {formatFirestoreDate(ban.unbannedAt)}
                                  </span>
                                )}
                              </div>
                              
                              {ban.unbanReason && (
                                <p className="text-sm text-green-600 mt-2">
                                  <strong>Unban Reason:</strong> {ban.unbanReason}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewUserDetails(ban.user?.userId || ban.userId)}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                              
                              {ban.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBan(ban)
                                    setUnbanDialogOpen(true)
                                  }}
                                  disabled={processingAction === 'unban'}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <Unlock className="w-4 h-4 mr-1" />
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setBanUserId(ban.user?.userId || ban.userId)
                                    setBanDialogOpen(true)
                                  }}
                                  disabled={processingAction === 'ban'}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  <Ban className="w-4 h-4 mr-1" />
                                  Re-Ban
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {filteredUsers.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <Ban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p>No banned users found</p>
                          {searchQuery && (
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Info */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">About User Ban</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Full bans completely block users from accessing the platform. Banned users cannot login, 
                      complete tasks, or make withdrawals. Their wallet balance can be frozen during the ban. 
                      All ban actions are logged with audit trail for compliance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="w-5 h-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              This will permanently block the user from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user ID (e.g., DTP123456)"
                value={banUserId}
                onChange={(e) => setBanUserId(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Ban Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter detailed reason for banning..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="freezeWallet"
                checked={freezeWallet}
                onCheckedChange={(checked: boolean) => setFreezeWallet(checked)}
              />
              <Label htmlFor="freezeWallet" className="text-sm">
                Freeze wallet balance (move to holding)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBanUser}
              disabled={!banUserId || !banReason || processingAction === 'ban'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {processingAction === 'ban' ? 'Banning...' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Dialog */}
      <Dialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Unlock className="w-5 h-5" />
              Unban User
            </DialogTitle>
            <DialogDescription>
              Restore user access to the platform.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">{selectedBan?.user?.name}</p>
              <p className="text-xs text-gray-500">{selectedBan?.user?.userId}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unbanReason">Unban Reason</Label>
              <Textarea
                id="unbanReason"
                placeholder="Enter reason for unbanning..."
                value={unbanReason}
                onChange={(e) => setUnbanReason(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="restoreWallet"
                checked={restoreWallet}
                onCheckedChange={(checked: boolean) => setRestoreWallet(checked)}
              />
              <Label htmlFor="restoreWallet" className="text-sm">
                Restore frozen wallet balance (₹{selectedBan?.walletBalanceAtBan || 0})
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUnbanUser}
              disabled={processingAction === 'unban'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processingAction === 'unban' ? 'Unbanning...' : 'Unban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Ban Dialog */}
      <Dialog open={bulkBanDialogOpen} onOpenChange={setBulkBanDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" />
              Bulk Ban Users
            </DialogTitle>
            <DialogDescription>
              Ban multiple users at once (max 50 users).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkUserIds">User IDs (one per line)</Label>
              <Textarea
                id="bulkUserIds"
                placeholder="DTP123456&#10;DTP789012&#10;DTP345678"
                value={bulkUserIds}
                onChange={(e) => setBulkUserIds(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-gray-500">
                {bulkUserIds.split('\n').filter(id => id.trim()).length} users entered
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bulkReason">Ban Reason (applies to all)</Label>
              <Textarea
                id="bulkReason"
                placeholder="Enter reason for banning all users..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulkFreezeWallet"
                checked={bulkFreezeWallet}
                onCheckedChange={(checked: boolean) => setBulkFreezeWallet(checked)}
              />
              <Label htmlFor="bulkFreezeWallet" className="text-sm">
                Freeze wallet balances for all users
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkBan}
              disabled={!bulkUserIds || !bulkReason || processingAction === 'bulk'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {processingAction === 'bulk' ? 'Banning...' : 'Bulk Ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user profile and activity history
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading user details...</p>
            </div>
          ) : userDetails ? (
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Profile</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{userDetails.user?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{userDetails.user?.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User ID</p>
                    <p className="font-medium">{userDetails.user?.userId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Wallet Balance</p>
                    <p className="font-medium">₹{userDetails.user?.walletBalance || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge className={userDetails.user?.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                      {userDetails.user?.isBanned ? 'BANNED' : 'ACTIVE'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Level</p>
                    <p className="font-medium">Level {userDetails.user?.level || 1}</p>
                  </div>
                </div>
              </div>

              {/* Ban History */}
              <div>
                <h3 className="font-semibold mb-2">Ban History</h3>
                <div className="space-y-2">
                  {userDetails.banHistory?.map((ban: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <Badge className={ban.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                          {ban.status === 'active' ? 'BANNED' : 'LIFTED'}
                        </Badge>
                        <span className="text-gray-500 text-xs">
                          {formatFirestoreDate(ban.bannedAt, 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-gray-700">{ban.reason}</p>
                      {ban.unbanReason && (
                        <p className="text-green-600 text-xs mt-1">Unban: {ban.unbanReason}</p>
                      )}
                    </div>
                  ))}
                  {(!userDetails.banHistory || userDetails.banHistory.length === 0) && (
                    <p className="text-gray-500 text-sm">No ban history</p>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="font-semibold mb-2">Recent Transactions</h3>
                <div className="space-y-2">
                  {userDetails.recentTransactions?.map((tx: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg text-sm flex justify-between">
                      <div>
                        <p className="font-medium">{tx.description || tx.type}</p>
                        <p className="text-gray-500 text-xs">{tx.status}</p>
                      </div>
                      <span className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}₹{tx.amount}
                      </span>
                    </div>
                  ))}
                  {(!userDetails.recentTransactions || userDetails.recentTransactions.length === 0) && (
                    <p className="text-gray-500 text-sm">No recent transactions</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Failed to load user details</p>
          )}
          
          <DialogFooter>
            <Button onClick={() => setUserDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
