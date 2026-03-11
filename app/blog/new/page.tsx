'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, addDoc, collection } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'

interface BlogFormData {
  title: string
  slug: string
  excerpt: string
  content: string
  featuredImage: string
  author: string
  status: 'draft' | 'published'
  seoDescription: string
  publishedDate: string
}

const initialFormData: BlogFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featuredImage: '',
  author: 'DailyTaskPay Team',
  status: 'draft',
  seoDescription: '',
  publishedDate: new Date().toISOString().split('T')[0]
}

export default function BlogEditorPage() {
  const router = useRouter()
  const params = useParams()
  const [formData, setFormData] = useState<BlogFormData>(initialFormData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const isEditing = !!params.id

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is admin
      const userDocRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userDocRef)
      if (userSnap.data()?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setIsAdmin(true)

      // Load existing post if editing from blog_posts collection
      if (params.id) {
        try {
          const postRef = doc(db, 'blog_posts', params.id as string)
          const postSnap = await getDoc(postRef)
          if (postSnap.exists()) {
            const data = postSnap.data()
            setFormData({
              title: data.title || '',
              slug: data.slug || '',
              excerpt: data.excerpt || '',
              content: data.content || '',
              featuredImage: data.featuredImage || '',
              author: data.author || 'DailyTaskPay Team',
              status: data.status || 'draft',
              seoDescription: data.seoDescription || '',
              publishedDate: data.publishedDate || new Date().toISOString().split('T')[0]
            })
          } else {
            router.push('/blog')
          }
        } catch (error) {
          console.error('Error loading post:', error)
        }
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [params.id, router])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }))
  }

  const handleSave = async (publish = false) => {
    if (!formData.title || !formData.content) {
      alert('Please fill in the title and content')
      return
    }

    setSaving(true)
    try {
      const status = publish ? 'published' : formData.status
      const postData = {
        ...formData,
        status,
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() }),
        ...(status === 'published' && !formData.publishedDate ? { publishedDate: new Date().toISOString() } : {})
      }

      if (isEditing) {
        await updateDoc(doc(db, 'blog_posts', params.id as string), postData)
      } else {
        await addDoc(collection(db, 'blog_posts'), postData)
      }

      alert(`Post ${publish ? 'published' : 'saved'} successfully!`)
      router.push('/blog')
    } catch (error) {
      console.error('Error saving post:', error)
      alert('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/blog')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-2xl font-bold text-black">
                  {isEditing ? 'Edit Post' : 'Create Post'}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {formData.status === 'published' ? (
                    <><EyeOff className="w-4 h-4 mr-2" /> Unpublish</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-2" /> Save Draft</>
                  )}
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Publish'}
                </Button>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Basic Information</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={handleTitleChange}
                      placeholder="Enter post title"
                      className="text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug *
                    </label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="post-url-slug"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      This will be the URL: /blog/{formData.slug}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Excerpt *
                    </label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Brief description of the post (shown in blog list)"
                      className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                      maxLength={200}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.excerpt.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author
                    </label>
                    <Input
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="Author name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Featured Image URL
                    </label>
                    <Input
                      value={formData.featuredImage}
                      onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Content */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Content</h2>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your blog post content here... (HTML supported)"
                    className="w-full px-3 py-2 border rounded-md min-h-[400px] font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500">
                    HTML tags are supported. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, etc.
                  </p>
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">SEO Settings</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SEO Description
                    </label>
                    <textarea
                      value={formData.seoDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                      placeholder="Brief description for search engines and social sharing"
                      className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                      maxLength={160}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.seoDescription.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Published Date
                    </label>
                    <Input
                      type="date"
                      value={formData.publishedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, publishedDate: e.target.value }))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Date when the post will be/was published
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
