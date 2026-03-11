'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { 
  Play, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  DollarSign, 
  Clock, 
  BarChart3,
  Code,
  RefreshCw
} from 'lucide-react'

interface RewardAd {
  id: string
  title: string
  rewardAmount: number
  duration: number
  adScript: string
  dailyUserLimit: number
  globalLimit: number
  totalViews: number
  status: 'active' | 'disabled'
  createdDate: string
}

interface AdAnalytics {
  totalAds: number
  activeAds: number
  todayWatches: number
  todayRewards: number
  totalWatches: number
  totalRewards: number
}

export default function RewardAdsManagerPage() {
  const router = useRouter()
  const [ads, setAds] = useState<RewardAd[]>([])
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAd, setEditingAd] = useState<RewardAd | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    rewardAmount: 1,
    duration: 30,
    adScript: '',
    dailyUserLimit: 5,
    globalLimit: 1000,
    status: 'active' as 'active' | 'disabled'
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }
      fetchAds()
      fetchAnalytics()
    })

    return () => unsubscribe()
  }, [router])

  const fetchAds = async () => {
    try {
      const getRewardAds = httpsCallable(functions, 'getRewardAds')
      const result = await getRewardAds()
      const data = result.data as { success: boolean; ads: RewardAd[] }
      if (data.success) {
        setAds(data.ads)
      }
    } catch (error) {
      console.error('Error fetching ads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const getAdAnalytics = httpsCallable(functions, 'getAdAnalytics')
      const result = await getAdAnalytics()
      const data = result.data as { success: boolean; analytics: AdAnalytics }
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const handleCreateAd = async () => {
    try {
      const createRewardAd = httpsCallable(functions, 'createRewardAd')
      await createRewardAd(formData)
      setShowModal(false)
      resetForm()
      fetchAds()
      fetchAnalytics()
    } catch (error) {
      console.error('Error creating ad:', error)
      alert('Failed to create ad')
    }
  }

  const handleUpdateAd = async () => {
    if (!editingAd) return
    
    try {
      const updateRewardAd = httpsCallable(functions, 'updateRewardAd')
      await updateRewardAd({
        adId: editingAd.id,
        ...formData
      })
      setShowModal(false)
      setEditingAd(null)
      resetForm()
      fetchAds()
    } catch (error) {
      console.error('Error updating ad:', error)
      alert('Failed to update ad')
    }
  }

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return

    try {
      const deleteRewardAd = httpsCallable(functions, 'deleteRewardAd')
      await deleteRewardAd({ adId })
      fetchAds()
      fetchAnalytics()
    } catch (error) {
      console.error('Error deleting ad:', error)
      alert('Failed to delete ad')
    }
  }

  const handleToggleStatus = async (ad: RewardAd) => {
    try {
      const updateRewardAd = httpsCallable(functions, 'updateRewardAd')
      await updateRewardAd({
        adId: ad.id,
        status: ad.status === 'active' ? 'disabled' : 'active'
      })
      fetchAds()
    } catch (error) {
      console.error('Error toggling status:', error)
      alert('Failed to update status')
    }
  }

  const openEditModal = (ad: RewardAd) => {
    setEditingAd(ad)
    setFormData({
      title: ad.title,
      rewardAmount: ad.rewardAmount,
      duration: ad.duration,
      adScript: ad.adScript,
      dailyUserLimit: ad.dailyUserLimit,
      globalLimit: ad.globalLimit,
      status: ad.status
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingAd(null)
    resetForm()
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      rewardAmount: 1,
      duration: 30,
      adScript: '',
      dailyUserLimit: 5,
      globalLimit: 1000,
      status: 'active'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
              <h1 className="text-2xl font-bold text-black">Reward Ads Manager</h1>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={fetchAds}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
                <Button 
                  onClick={openCreateModal}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Ad
                </Button>
              </div>
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Ads</p>
                        <p className="text-lg font-bold">{analytics.totalAds}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Play className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Active Ads</p>
                        <p className="text-lg font-bold">{analytics.activeAds}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Today Views</p>
                        <p className="text-lg font-bold">{analytics.todayWatches}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Today Rewards</p>
                        <p className="text-lg font-bold">₹{analytics.todayRewards}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Views</p>
                        <p className="text-lg font-bold">{analytics.totalWatches}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Rewards</p>
                        <p className="text-lg font-bold">₹{analytics.totalRewards}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Ads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ads.map((ad) => (
                  <div key={ad.id}>
                    <Card className={`${ad.status === 'disabled' ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-semibold">{ad.title}</CardTitle>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditModal(ad)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(ad)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {ad.status === 'active' ? (
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteAd(ad.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                              <span className="font-semibold">₹{ad.rewardAmount}</span> reward
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">{ad.duration}s duration</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">{ad.totalViews} views</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">
                              {ad.dailyUserLimit}/day limit
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Code className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500 truncate flex-1">
                            {ad.adScript.substring(0, 50)}...
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ad.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {ad.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Global: {ad.totalViews}/{ad.globalLimit}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
            </div>

            {ads.length === 0 && (
              <div className="text-center py-12">
                <Play className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No reward ads created yet</p>
                <Button onClick={openCreateModal} className="mt-4">
                  Create First Ad
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">
                {editingAd ? 'Edit Reward Ad' : 'Create Reward Ad'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Title
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Watch Video Ad"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reward Amount (₹)
                    </label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={formData.rewardAmount}
                      onChange={(e) => setFormData({ ...formData, rewardAmount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (seconds)
                    </label>
                    <Input
                      type="number"
                      min="5"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily User Limit
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.dailyUserLimit}
                      onChange={(e) => setFormData({ ...formData, dailyUserLimit: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Global Limit
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.globalLimit}
                      onChange={(e) => setFormData({ ...formData, globalLimit: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Script Code
                  </label>
                  <textarea
                    value={formData.adScript}
                    onChange={(e) => setFormData({ ...formData, adScript: e.target.value })}
                    placeholder="Paste your ad script here (Adsterra, Monetag, etc.)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] text-sm font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the ad script code from your ad network (Adsterra, Monetag, PropellerAds)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'disabled' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    setEditingAd(null)
                    resetForm()
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingAd ? handleUpdateAd : handleCreateAd}
                  className="flex-1"
                >
                  {editingAd ? 'Update Ad' : 'Create Ad'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
