'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface Announcement {
  id: string
  text: string
  enabled: boolean
  speed: number
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newText, setNewText] = useState('')
  const [newSpeed, setNewSpeed] = useState(40)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editSpeed, setEditSpeed] = useState(40)
  const [isAdmin, setIsAdmin] = useState(false)

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
      setIsAdmin(true)

      // Subscribe to announcements
      const q = query(collection(db, 'site_announcements'), orderBy('createdAt', 'desc'))
      
      const unsubscribeAnnouncements = onSnapshot(q, (snapshot) => {
        const items: Announcement[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          items.push({
            id: doc.id,
            text: data.text || '',
            enabled: data.enabled || false,
            speed: data.speed || 40,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            createdBy: data.createdBy || ''
          })
        })
        setAnnouncements(items)
        setLoading(false)
      })

      return () => unsubscribeAnnouncements()
    })

    return () => unsubscribe()
  }, [router])

  const createAnnouncement = async () => {
    if (!newText.trim()) return
    
    try {
      const docRef = doc(collection(db, 'site_announcements'))
      await setDoc(docRef, {
        text: newText.trim(),
        enabled: true,
        speed: newSpeed,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: auth.currentUser?.uid
      })
      setNewText('')
      setNewSpeed(40)
    } catch (error) {
      console.error('Error creating announcement:', error)
    }
  }

  const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
      const docRef = doc(db, 'site_announcements', id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating announcement:', error)
    }
  }

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'site_announcements', id))
    } catch (error) {
      console.error('Error deleting announcement:', error)
    }
  }

  const startEditing = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setEditText(announcement.text)
    setEditSpeed(announcement.speed || 40)
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    await updateAnnouncement(id, { text: editText.trim(), speed: editSpeed })
    setEditingId(null)
    setEditText('')
    setEditSpeed(40)
  }

  const toggleEnabled = async (announcement: Announcement) => {
    await updateAnnouncement(announcement.id, { enabled: !announcement.enabled })
  }

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
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                  <Megaphone className="w-8 h-8 text-primary" />
                  Announcements
                </h1>
                <p className="text-gray-500">Manage site-wide announcement marquee</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-sm">
                  Total: {announcements.length}
                </Badge>
                <Badge className="bg-green-100 text-green-700 text-sm">
                  Active: {announcements.filter(a => a.enabled).length}
                </Badge>
              </div>
            </div>

            {/* Create New */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Announcement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Enter announcement text (e.g., New tasks available! Earn up to ₹50 per task...)"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="flex-1"
                      maxLength={200}
                    />
                    <Button 
                      onClick={createAnnouncement}
                      disabled={!newText.trim()}
                      className="bg-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-600">Scroll Speed (seconds):</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={newSpeed}
                      onChange={(e) => setNewSpeed(Number(e.target.value))}
                      className="w-48"
                    />
                    <span className="text-sm font-medium w-12">{newSpeed}s</span>
                    <span className="text-xs text-gray-500">(Lower = faster, Higher = slower)</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  {newText.length}/200 characters. Speed controls how fast the text scrolls across the screen.
                </p>
              </CardContent>
            </Card>

            {/* Preview */}
            {announcements.filter(a => a.enabled).length > 0 && (
              <Card className="mb-6 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-primary via-blue-600 to-primary text-white py-2 overflow-hidden rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 px-4 flex items-center gap-2 bg-primary/20">
                        <Megaphone className="w-4 h-4" />
                        <span className="text-xs font-medium">ANNOUNCEMENT</span>
                      </div>
                      <div className="flex whitespace-nowrap animate-marquee">
                        {announcements.filter(a => a.enabled).map((a) => (
                          <span key={a.id} className="text-sm font-medium px-8">{a.text}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div 
                      key={announcement.id}
                      className={`p-4 border rounded-lg ${announcement.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingId === announcement.id ? (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="flex-1"
                                  maxLength={200}
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => saveEdit(announcement.id)}
                                  className="bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditingId(null)
                                    setEditText('')
                                    setEditSpeed(40)
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="text-sm text-gray-600">Speed:</label>
                                <input
                                  type="range"
                                  min="10"
                                  max="100"
                                  value={editSpeed}
                                  onChange={(e) => setEditSpeed(Number(e.target.value))}
                                  className="w-32"
                                />
                                <span className="text-sm font-medium w-10">{editSpeed}s</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-gray-900 font-medium">{announcement.text}</p>
                              <p className="text-xs text-gray-500 mt-1">Speed: {announcement.speed || 40}s</p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Created: {format(announcement.createdAt.toDate(), 'MMM d, yyyy h:mm a')}</span>
                            <span>Updated: {format(announcement.updatedAt.toDate(), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={announcement.enabled}
                            onCheckedChange={() => toggleEnabled(announcement)}
                          />
                          <span className={`text-xs font-medium ${announcement.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {announcement.enabled ? 'Active' : 'Inactive'}
                          </span>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(announcement)}
                            disabled={editingId === announcement.id}
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAnnouncement(announcement.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {announcements.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>No announcements yet</p>
                      <p className="text-sm text-gray-400 mt-1">Create your first announcement above</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">How it works</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Only the most recent <strong>active</strong> announcement will be displayed on the landing page marquee. 
                      The text will scroll automatically and be visible to all visitors including logged-out users.
                      You can control the scroll speed (10s = fast, 100s = slow).
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
