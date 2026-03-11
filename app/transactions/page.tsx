'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  CheckCircle,
  User,
  Calendar
} from 'lucide-react'

interface Transaction {
  id: string
  userId: string
  userEmail?: string
  type: string
  amount: number
  description: string
  status: string
  createdAt: any
}

export default function AdminTransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
      const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
        const transactionList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[]
        setTransactions(transactionList)
        setLoading(false)
      })

      return () => unsubscribeTransactions()
    })

    return () => unsubscribe()
  }, [router])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'task_reward':
      case 'task':
        return <CheckCircle className="w-5 h-5 text-blue-600" />
      case 'referral':
        return <ArrowUpRight className="w-5 h-5 text-purple-600" />
      case 'bonus':
        return <Wallet className="w-5 h-5 text-yellow-600" />
      case 'withdrawal':
        return <ArrowDownLeft className="w-5 h-5 text-red-600" />
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString()
    }
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const totalEarnings = transactions
    .filter(t => t.amount > 0 && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = Math.abs(transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0))

  const transactionCounts = {
    task: transactions.filter(t => t.type === 'task_reward' || t.type === 'task').length,
    referral: transactions.filter(t => t.type === 'referral').length,
    bonus: transactions.filter(t => t.type === 'bonus').length,
    withdrawal: transactions.filter(t => t.type === 'withdrawal').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black flex items-center">
                <CreditCard className="w-6 h-6 mr-2" />
                All Transactions
              </h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Earnings Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalEarnings}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalWithdrawals}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Net Flow</p>
                  <p className={`text-2xl font-bold ${totalEarnings - totalWithdrawals >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{totalEarnings - totalWithdrawals}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Type Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Task Rewards</p>
                      <p className="text-xl font-bold text-blue-700">{transactionCounts.task}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <ArrowUpRight className="w-5 h-5 text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Referrals</p>
                      <p className="text-xl font-bold text-purple-700">{transactionCounts.referral}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Wallet className="w-5 h-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Bonuses</p>
                      <p className="text-xl font-bold text-yellow-700">{transactionCounts.bonus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <ArrowDownLeft className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Withdrawals</p>
                      <p className="text-xl font-bold text-red-700">{transactionCounts.withdrawal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Description</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium">{transaction.userEmail || 'N/A'}</p>
                                <p className="text-xs text-gray-500">ID: {transaction.userId.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getTransactionIcon(transaction.type)}
                              <span className="ml-2 text-sm capitalize">{transaction.type.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-700">{transaction.description}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                              transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(transaction.createdAt)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No transactions yet</p>
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
