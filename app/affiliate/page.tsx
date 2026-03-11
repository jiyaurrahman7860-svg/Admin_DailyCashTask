'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Link as LinkIcon, Edit2, Trash2, ExternalLink, Copy, CheckCircle } from 'lucide-react'

interface AffiliateLink {
  id: string
  name: string
  url: string
  description: string
  category: string
  status: 'active' | 'inactive'
  clickCount: number
  createdAt: any
  updatedAt: any
}

export default function AffiliateLinksPage() {
  const router = useRouter()
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: 'general',
    status: 'active'
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      console.log('User authenticated:', user.uid)
      console.log('Fetching affiliate links from collection: affiliateLinks')
      
      // First, try getDocs to check if data exists
      try {
        const snapshot = await getDocs(collection(db, 'affiliateLinks'))
        console.log('getDocs result - docs count:', snapshot.size)
        snapshot.forEach((doc) => {
          console.log('Document found:', doc.id, doc.data())
        })
      } catch (err) {
        console.error('getDocs error:', err)
      }
      
      // Then use onSnapshot for real-time updates
      const unsubscribeLinks = onSnapshot(
        collection(db, 'affiliateLinks'), 
        (snapshot) => {
          console.log('onSnapshot triggered - docs count:', snapshot.size)
          console.log('Snapshot empty:', snapshot.empty)
          
          const linkList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as AffiliateLink[]
          
          console.log('Affiliate links fetched:', linkList.length, 'links')
          console.log('Link data:', linkList)
          
          setLinks(linkList)
          setLoading(false)
        },
        (error) => {
          console.error('Error fetching affiliate links:', error)
          alert('Permission denied. Please check Firestore rules.')
          setLoading(false)
        }
      )

      return () => unsubscribeLinks()
    })

    return () => unsubscribe()
  }, [router])

  const handleCopy = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link)
    alert('Link copied to clipboard!')
  }

  const handleEdit = (link: AffiliateLink) => {
    setEditingLink(link)
    setFormData({
      name: link.name,
      url: link.url,
      description: link.description,
      category: link.category,
      status: link.status
    })
    setShowForm(true)
  }

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    console.log('Saving affiliate link...', formData)
    
    const linkData = {
      ...formData,
      clickCount: editingLink?.clickCount || 0,
      createdAt: editingLink?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      if (editingLink) {
        console.log('Updating existing link:', editingLink.id)
        await updateDoc(doc(db, 'affiliateLinks', editingLink.id), linkData)
        alert('Affiliate link updated successfully!')
      } else {
        console.log('Creating new link in collection: affiliateLinks')
        const docRef = await addDoc(collection(db, 'affiliateLinks'), linkData)
        console.log('Link created with ID:', docRef.id)
        alert('Affiliate link created successfully! ID: ' + docRef.id)
      }
      
      setFormData({
        name: '',
        url: '',
        description: '',
        category: 'general',
        status: 'active'
      })
      setShowForm(false)
      setEditingLink(null)
    } catch (error: any) {
      console.error('Error saving link:', error)
      alert('Failed to save link: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDelete = async (linkId: string) => {
    if (!confirm('Delete this affiliate link?')) return
    try {
      await deleteDoc(doc(db, 'affiliateLinks', linkId))
      alert('Affiliate link deleted!')
    } catch (error) {
      alert('Failed to delete link')
    }
  }

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
                <LinkIcon className="w-6 h-6 mr-2" />
                Affiliate Links
              </h1>
              <Button onClick={() => setShowForm(true)}>
                Create New Link
              </Button>
            </div>

            {showForm && (
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={(e) => handleSave(e)}>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                        Name
                      </label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
                        URL
                      </label>
                      <Input
                        id="url"
                        type="text"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                        Description
                      </label>
                      <Input
                        id="description"
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                        Category
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="general">General</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                        Status
                      </label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <Button type="submit" onClick={(e) => handleSave(e)}>
                      Save
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">URL</th>
                        <th className="text-left py-3 px-4">Description</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((link) => (
                        <tr key={link.id} className="border-b">
                          <td className="py-3 px-4 font-medium">{link.name}</td>
                          <td className="py-3 px-4">{link.url}</td>
                          <td className="py-3 px-4">{link.description}</td>
                          <td className="py-3 px-4">{link.category}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm ${
                              link.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {link.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(link.url, link.id)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(link)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(link.id)}
                              >
                                <Trash2 className="w-4 h-4" />
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
