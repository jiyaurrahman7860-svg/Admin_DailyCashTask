'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Users, Search, Ban, Edit2, Trash2, Wallet, CheckCircle, EyeOff, Eye } from 'lucide-react'

interface User {
  id: string
  userId: string
  name: string
  email: string
  walletBalance: number
  tasksCompleted: number
  referralCount: number
  level: number
  banned?: boolean
  isShadowBanned?: boolean
  shadowBanReason?: string
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const userList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[]
        setUsers(userList)
        setLoading(false)
      })

      return () => unsubscribeUsers()
    })

    return () => unsubscribe()
  }, [router])

  const handleBanUser = async (userId: string, banned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { banned: !banned })
      alert(`User ${banned ? 'unbanned' : 'banned'} successfully`)
    } catch (error) {
      alert('Failed to update user status')
    }
  }

  const handleEditWallet = async (userId: string, newBalance: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), { walletBalance: newBalance })
      alert('Wallet balance updated')
    } catch (error) {
      alert('Failed to update wallet')
    }
  }

  const handleShadowBanUser = async (userId: string, shadowBanned: boolean, reason?: string) => {
    try {
      if (shadowBanned) {
        await updateDoc(doc(db, 'users', userId), { 
          isShadowBanned: false,
          shadowBanReason: null,
          shadowBannedAt: null,
          shadowBannedBy: null
        })
        alert('Shadow ban removed successfully')
      } else {
        const banReason = reason || 'Manual shadow ban by admin'
        await updateDoc(doc(db, 'users', userId), { 
          isShadowBanned: true,
          shadowBanReason: banReason,
          shadowBannedAt: new Date(),
          shadowBannedBy: auth.currentUser?.uid
        })
        alert('User shadow banned successfully')
      }
    } catch (error) {
      console.error('Error updating shadow ban status:', error)
      alert('Failed to update shadow ban status')
    }
  }

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                <Users className="w-6 h-6 mr-2" />
                User Management
              </h1>
              <p className="text-gray-500">Total Users: {users.length}</p>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or user ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User ID</th>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Balance</th>
                        <th className="text-left py-3 px-4">Tasks</th>
                        <th className="text-left py-3 px-4">Level</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className={`border-b ${user.banned ? 'bg-red-50' : ''} ${user.isShadowBanned ? 'bg-orange-50' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {user.userId}
                              {user.isShadowBanned && (
                                <EyeOff className="w-4 h-4 text-orange-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{user.name}</td>
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">₹{user.walletBalance || 0}</td>
                          <td className="py-3 px-4">{user.tasksCompleted || 0}</td>
                          <td className="py-3 px-4">{user.level || 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newBalance = prompt('Enter new wallet balance:', 
                                    user.walletBalance?.toString() || '0')
                                  if (newBalance) {
                                    handleEditWallet(user.id, parseFloat(newBalance))
                                  }
                                }}
                              >
                                <Wallet className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={user.isShadowBanned ? 'default' : 'outline'}
                                size="sm"
                                className={user.isShadowBanned ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-600 text-orange-600 hover:bg-orange-50'}
                                onClick={() => {
                                  if (user.isShadowBanned) {
                                    handleShadowBanUser(user.id, true)
                                  } else {
                                    const reason = prompt('Enter shadow ban reason:', 'Suspicious activity detected')
                                    if (reason) {
                                      handleShadowBanUser(user.id, false, reason)
                                    }
                                  }
                                }}
                              >
                                {user.isShadowBanned ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant={user.banned ? 'default' : 'destructive'}
                                size="sm"
                                onClick={() => handleBanUser(user.id, user.banned || false)}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
