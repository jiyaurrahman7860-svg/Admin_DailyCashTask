'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  User,
  Ban,
  CheckCheck,
  CreditCard,
  Hash,
  AlertCircle,
  Search
} from 'lucide-react'

interface WithdrawalRequest {
  id: string
  userId: string
  userEmail: string
  amount: number
  method: string
  status: 'pending' | 'successful' | 'rejected'
  createdAt: any
  reviewedAt?: any
  reviewedBy?: string
  rejectionReason?: string
  transactionReferenceId?: string
  accountDetails?: {
    accountNumber?: string
    ifscCode?: string
    accountHolderName?: string
    upiId?: string
    paytmNumber?: string
    paypalEmail?: string
  }
}

export default function AdminWithdrawalsPage() {
  const router = useRouter()
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [transactionReferenceId, setTransactionReferenceId] = useState<string>('')
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'))
      const unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
        const withdrawalList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WithdrawalRequest[]
        setWithdrawals(withdrawalList)
        setFilteredWithdrawals(withdrawalList)
        setLoading(false)
      })

      return () => unsubscribeWithdrawals()
    })

    return () => unsubscribe()
  }, [router])

  const handleApproveClick = (withdrawalId: string) => {
    setShowApproveModal(withdrawalId)
    setTransactionReferenceId('')
    setErrorMessage('')
  }

  const handleApproveConfirm = async (withdrawal: WithdrawalRequest) => {
    if (!transactionReferenceId.trim()) {
      setErrorMessage('Transaction Reference ID is required before approving withdrawal.')
      return
    }

    setProcessingId(withdrawal.id)
    setErrorMessage('')
    
    try {
      // Call Cloud Function for approval
      const approveWithdrawal = httpsCallable(functions, 'approveWithdrawal')
      const result = await approveWithdrawal({
        withdrawalId: withdrawal.id,
        transactionReferenceId: transactionReferenceId.trim()
      })

      const data = result.data as { success: boolean; message: string }
      
      if (data.success) {
        setShowApproveModal(null)
        setTransactionReferenceId('')
        alert('Withdrawal approved successfully!')
      } else {
        setErrorMessage(data.message || 'Failed to approve withdrawal')
      }
    } catch (error: any) {
      console.error('Error approving withdrawal:', error)
      // Handle Firebase callable errors
      if (error.code === 'functions/permission-denied') {
        setErrorMessage('Admin access required')
      } else if (error.code === 'functions/not-found') {
        setErrorMessage('Withdrawal not found')
      } else if (error.code === 'functions/failed-precondition') {
        setErrorMessage(error.message || 'Withdrawal already processed')
      } else if (error.code === 'functions/invalid-argument') {
        setErrorMessage(error.message || 'Transaction Reference ID is required')
      } else {
        setErrorMessage(error.message || 'Failed to approve withdrawal')
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancelApprove = () => {
    setShowApproveModal(null)
    setTransactionReferenceId('')
    setErrorMessage('')
  }

  // Search filter function
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWithdrawals(withdrawals)
      return
    }
    const query = searchQuery.toLowerCase()
    const filtered = withdrawals.filter(w => 
      w.userEmail?.toLowerCase().includes(query) ||
      w.userId?.toLowerCase().includes(query) ||
      w.amount?.toString().includes(query) ||
      w.method?.toLowerCase().includes(query) ||
      w.status?.toLowerCase().includes(query) ||
      w.transactionReferenceId?.toLowerCase().includes(query)
    )
    setFilteredWithdrawals(filtered)
  }, [searchQuery, withdrawals])

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    setProcessingId(withdrawal.id)
    try {
      // Call Cloud Function for rejection
      const rejectWithdrawal = httpsCallable(functions, 'rejectWithdrawal')
      const result = await rejectWithdrawal({
        withdrawalId: withdrawal.id,
        reason: reason
      })

      const data = result.data as { success: boolean; message: string }
      
      if (data.success) {
        alert('Withdrawal rejected and amount refunded!')
      } else {
        alert('Failed to reject withdrawal: ' + (data.message || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error)
      // Handle Firebase callable errors
      if (error.code === 'functions/permission-denied') {
        alert('Admin access required')
      } else if (error.code === 'functions/not-found') {
        alert('Withdrawal not found')
      } else if (error.code === 'functions/failed-precondition') {
        alert(error.message || 'Withdrawal already processed')
      } else {
        alert('Failed to reject withdrawal: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'successful':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString()
    }
    return new Date(timestamp).toLocaleString()
  }

  const renderAccountDetails = (withdrawal: WithdrawalRequest) => {
    const { method, accountDetails } = withdrawal
    if (!accountDetails) return 'N/A'

    if (method === 'bank') {
      return (
        <div className="text-sm">
          <p><span className="font-medium">Account:</span> {accountDetails.accountNumber}</p>
          <p><span className="font-medium">IFSC:</span> {accountDetails.ifscCode}</p>
          <p><span className="font-medium">Holder:</span> {accountDetails.accountHolderName}</p>
        </div>
      )
    } else if (method === 'upi') {
      return <p className="text-sm"><span className="font-medium">UPI ID:</span> {accountDetails.upiId}</p>
    } else if (method === 'paytm') {
      return <p className="text-sm"><span className="font-medium">Paytm:</span> {accountDetails.paytmNumber}</p>
    } else if (method === 'paypal') {
      return <p className="text-sm"><span className="font-medium">PayPal:</span> {accountDetails.paypalEmail}</p>
    }
    return 'N/A'
  }

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length
  const successfulCount = withdrawals.filter(w => w.status === 'successful').length
  const rejectedCount = withdrawals.filter(w => w.status === 'rejected').length
  const totalAmount = withdrawals
    .filter(w => w.status === 'successful')
    .reduce((sum, w) => sum + w.amount, 0)

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending')
  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0)

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
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black flex items-center">
                <Wallet className="w-6 h-6 mr-2" />
                Withdrawal Management
              </h1>
              <div className="flex items-center gap-4">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email, ID, amount..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Pending Requests</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingWithdrawals.length}</p>
                </div>
              </div>
            </div>

            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Pending Amount</p>
                    <p className="text-2xl font-bold text-yellow-700">₹{totalPending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">All Withdrawals</h3>
                  {searchQuery && (
                    <p className="text-sm text-gray-500">
                      Showing {filteredWithdrawals.length} of {withdrawals.length} results
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Method & Account</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWithdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium">{withdrawal.userEmail}</p>
                                <p className="text-xs text-gray-500">ID: {withdrawal.userId.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-start">
                              {withdrawal.method === 'bank' ? (
                                <Building2 className="w-4 h-4 mr-2 text-gray-400 mt-1" />
                              ) : (
                                <CreditCard className="w-4 h-4 mr-2 text-gray-400 mt-1" />
                              )}
                              <div>
                                <p className="text-sm font-medium capitalize">{withdrawal.method}</p>
                                <div className="text-xs text-gray-500">
                                  {renderAccountDetails(withdrawal)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600">₹{withdrawal.amount}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-600">{formatDate(withdrawal.createdAt)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              withdrawal.status === 'successful' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {withdrawal.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                              {withdrawal.status === 'successful' && <CheckCheck className="w-3 h-3 inline mr-1" />}
                              {withdrawal.status === 'rejected' && <Ban className="w-3 h-3 inline mr-1" />}
                              {withdrawal.status === 'successful' ? 'Successful' : withdrawal.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {withdrawal.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApproveClick(withdrawal.id)}
                                  disabled={processingId === withdrawal.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingId === withdrawal.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReject(withdrawal)}
                                  disabled={processingId === withdrawal.id}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {withdrawal.status === 'successful' ? (
                                  <span className="text-green-600">
                                    <CheckCheck className="w-4 h-4 inline mr-1" />
                                    Successful
                                  </span>
                                ) : (
                                  <span className="text-red-600">
                                    <Ban className="w-4 h-4 inline mr-1" />
                                    Rejected
                                    {withdrawal.rejectionReason && (
                                      <p className="text-xs mt-1 max-w-xs" title={withdrawal.rejectionReason}>
                                        Reason: {withdrawal.rejectionReason.slice(0, 30)}...
                                      </p>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                            {withdrawal.status === 'successful' && withdrawal.transactionReferenceId && (
                              <div className="mt-2 p-2 bg-green-50 rounded">
                                <p className="text-xs text-green-700 flex items-center">
                                  <Hash className="w-3 h-3 mr-1" />
                                  Transaction ID: {withdrawal.transactionReferenceId}
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Approve Modal */}
            {showApproveModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Approve Withdrawal
                  </h3>
                  
                  {(() => {
                    const withdrawal = withdrawals.find(w => w.id === showApproveModal)
                    if (!withdrawal) return null
                    return (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Amount: <span className="font-semibold text-green-600">₹{withdrawal.amount}</span>
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          User: <span className="font-medium">{withdrawal.userEmail}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Method: <span className="font-medium capitalize">{withdrawal.method}</span>
                        </p>
                      </div>
                    )
                  })()}
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Reference ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={transactionReferenceId}
                      onChange={(e) => setTransactionReferenceId(e.target.value)}
                      placeholder="Enter Transaction Reference ID (e.g., TXN123456789)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      autoFocus
                    />
                    {errorMessage && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errorMessage}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      variant="default"
                      onClick={() => {
                        const withdrawal = withdrawals.find(w => w.id === showApproveModal)
                        if (withdrawal) handleApproveConfirm(withdrawal)
                      }}
                      disabled={processingId === showApproveModal}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processingId === showApproveModal ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Confirm Approval
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelApprove}
                      disabled={processingId === showApproveModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
