'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, Mail, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          router.push('/dashboard')
        }
      }
    })
    return () => unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
      
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        setError('Unauthorized access')
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-500">DailyTaskPay Administration</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="admin@dailytaskpay.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
