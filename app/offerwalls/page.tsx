'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Code,
  Globe,
  Smartphone,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  RefreshCw,
  Copy
} from 'lucide-react'

interface Offerwall {
  id: string
  name: string
  title: string
  description: string
  reward: number
  type: 'iframe' | 'sdk' | 'postback'
  iframeUrl?: string
  sdkKey?: string
  providerTaskUrl?: string
  postbackUrl?: string
  postbackSecret?: string
  status: 'active' | 'inactive'
  createdAt: Timestamp
  updatedAt?: Timestamp
}

const TYPE_ICONS = {
  iframe: Globe,
  sdk: Smartphone,
  postback: Code,
}

const TYPE_LABELS = {
  iframe: 'iFrame',
  sdk: 'SDK',
  postback: 'Postback',
}

export default function OfferwallsPage() {
  const router = useRouter()
  const [offerwalls, setOfferwalls] = useState<Offerwall[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    reward: 0,
    type: 'iframe' as 'iframe' | 'sdk' | 'postback',
    iframeUrl: '',
    sdkKey: '',
    providerTaskUrl: '',
    postbackUrl: '',
    postbackSecret: '',
    status: 'active' as 'active' | 'inactive',
  })
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }
      loadOfferwalls()
    })
    return () => unsubscribe()
  }, [router])

  const loadOfferwalls = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'offerwall_providers'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Offerwall[]
      setOfferwalls(data)
    } catch (error) {
      console.error('Error loading offerwalls:', error)
      alert('Failed to load offerwalls')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOfferwalls()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const data = {
        ...formData,
        reward: Number(formData.reward),
        updatedAt: Timestamp.now(),
      }

      if (editingId) {
        await updateDoc(doc(db, 'offerwall_providers', editingId), data)
        alert('Offerwall updated successfully')
      } else {
        await addDoc(collection(db, 'offerwall_providers'), {
          ...data,
          createdAt: Timestamp.now(),
        })
        alert('Offerwall created successfully')
      }

      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadOfferwalls()
    } catch (error) {
      console.error('Error saving offerwall:', error)
      alert('Failed to save offerwall')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      reward: 0,
      type: 'iframe',
      iframeUrl: '',
      sdkKey: '',
      providerTaskUrl: '',
      postbackUrl: '',
      postbackSecret: '',
      status: 'active',
    })
  }

  const handleEdit = (offerwall: Offerwall) => {
    setFormData({
      name: offerwall.name,
      title: offerwall.title || '',
      description: offerwall.description || '',
      reward: offerwall.reward || 0,
      type: offerwall.type,
      iframeUrl: offerwall.iframeUrl || '',
      sdkKey: offerwall.sdkKey || '',
      providerTaskUrl: offerwall.providerTaskUrl || '',
      postbackUrl: offerwall.postbackUrl || '',
      postbackSecret: offerwall.postbackSecret || '',
      status: offerwall.status,
    })
    setEditingId(offerwall.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offerwall?')) return

    try {
      await deleteDoc(doc(db, 'offerwall_providers', id))
      alert('Offerwall deleted successfully')
      loadOfferwalls()
    } catch (error) {
      console.error('Error deleting offerwall:', error)
      alert('Failed to delete offerwall')
    }
  }

  const handleToggleStatus = async (offerwall: Offerwall) => {
    try {
      const newStatus = offerwall.status === 'active' ? 'inactive' : 'active'
      await updateDoc(doc(db, 'offerwall_providers', offerwall.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      })
      alert(`Offerwall ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
      loadOfferwalls()
    } catch (error) {
      console.error('Error toggling status:', error)
      alert('Failed to update status')
    }
  }

  const handleGenerateTasks = async () => {
    if (!confirm('Generate tasks from all active providers now?')) return

    setGenerating(true)
    try {
      const generateTasks = httpsCallable(functions, 'manualGenerateTasks')
      const result = await generateTasks()
      const data = result.data as { success: boolean; tasksGenerated: number; message: string }
      alert(data.message)
    } catch (error) {
      console.error('Error generating tasks:', error)
      alert('Failed to generate tasks. Make sure you are logged in as admin.')
    } finally {
      setGenerating(false)
    }
  }

  const copyPostbackUrl = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/task/postback`
    navigator.clipboard.writeText(url)
    alert('Postback URL copied to clipboard!')
  }

  const filteredOfferwalls = offerwalls.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = offerwalls.filter(o => o.status === 'active').length
  const inactiveCount = offerwalls.filter(o => o.status === 'inactive').length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300 p-6">
            <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offerwall Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage offerwall providers and auto-generate tasks</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleGenerateTasks}
                disabled={generating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Generate Tasks'}
              </Button>
              <Button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </div>
          </div>

          {/* Postback URL Card */}
          <Card className="mb-6 dark:bg-[#1E293B] dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Postback Endpoint URL</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Share this URL with your offerwall providers</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyPostbackUrl}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
              </div>
              <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <code className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/task/postback
                </code>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Required parameters: userId, reward, transactionId, provider | Optional: signature (for validation)
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Offerwalls</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{offerwalls.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                    <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1E293B] dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
                    <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6 dark:bg-[#1E293B] dark:border-gray-700">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search offerwalls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Offerwalls Table */}
          <Card className="dark:bg-[#1E293B] dark:border-gray-700">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredOfferwalls.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">No offerwalls found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add your first offerwall to get started</p>
                  <Button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Offerwall
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredOfferwalls.map((offerwall) => {
                        const TypeIcon = TYPE_ICONS[offerwall.type]
                        return (
                          <tr key={offerwall.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                                  <TypeIcon className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{offerwall.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{offerwall.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                {TYPE_LABELS[offerwall.type]}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleStatus(offerwall)}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                  offerwall.status === 'active'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {offerwall.status === 'active' ? (
                                  <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {offerwall.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(offerwall)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDelete(offerwall.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
    </div>

    {/* Form Modal */}
    {showForm && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1E293B] rounded-lg shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Offerwall' : 'Add New Offerwall'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AdGate Media"
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Complete Surveys"
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the task to users..."
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reward Amount (₹)
                </label>
                <Input
                  type="number"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: Number(e.target.value) })}
                  placeholder="10"
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'iframe' | 'sdk' | 'postback' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                >
                  <option value="iframe">iFrame</option>
                  <option value="sdk">SDK</option>
                  <option value="postback">Postback API</option>
                </select>
              </div>

              {formData.type === 'iframe' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    iFrame URL
                  </label>
                  <Input
                    value={formData.iframeUrl}
                    onChange={(e) => setFormData({ ...formData, iframeUrl: e.target.value })}
                    placeholder="https://offerwall.com?uid={userId}"
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    required
                  />
                </div>
              )}

              {formData.type === 'sdk' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SDK Key
                  </label>
                  <Input
                    value={formData.sdkKey}
                    onChange={(e) => setFormData({ ...formData, sdkKey: e.target.value })}
                    placeholder="your-sdk-key"
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    required
                  />
                </div>
              )}

              {formData.type === 'postback' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Provider Task URL
                    </label>
                    <Input
                      value={formData.providerTaskUrl}
                      onChange={(e) => setFormData({ ...formData, providerTaskUrl: e.target.value })}
                      placeholder="https://offerwall.com/offers?uid={userId}"
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Postback Secret (Optional)
                    </label>
                    <Input
                      value={formData.postbackSecret}
                      onChange={(e) => setFormData({ ...formData, postbackSecret: e.target.value })}
                      placeholder="secret-key-for-validation"
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 dark:border-gray-700 dark:text-gray-300"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}
