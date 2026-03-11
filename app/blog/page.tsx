'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, FileText } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  author: string
  status: 'draft' | 'published'
  createdAt: any
  updatedAt: any
}

export default function BlogManagementPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

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

      // Load blog posts from blog_posts collection
      const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'))
      const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const blogPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BlogPost[]
        setPosts(blogPosts)
        setLoading(false)
      })

      return () => unsubscribePosts()
    })

    return () => unsubscribe()
  }, [router])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      await deleteDoc(doc(db, 'blog_posts', id))
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  const toggleStatus = async (post: BlogPost) => {
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published'
      await updateDoc(doc(db, 'blog_posts', post.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post')
    }
  }

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h1 className="text-2xl font-bold text-black">Blog Management</h1>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => router.push('/blog/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </div>

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search posts by title or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Posts</p>
                  <p className="text-2xl font-bold">{posts.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Published</p>
                  <p className="text-2xl font-bold text-green-600">
                    {posts.filter(p => p.status === 'published').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {posts.filter(p => p.status === 'draft').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Posts Table */}
            <Card>
              <CardContent className="p-0">
                {filteredPosts.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchQuery ? 'No posts found matching your search.' : 'No blog posts yet. Create your first post!'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredPosts.map((post) => (
                          <tr key={post.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-black">{post.title}</div>
                              <div className="text-sm text-gray-500 line-clamp-1">{post.excerpt}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{post.slug}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{post.author}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                post.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {post.status === 'published' ? (
                                  <><Eye className="w-3 h-3 mr-1" /> Published</>
                                ) : (
                                  <><EyeOff className="w-3 h-3 mr-1" /> Draft</>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {post.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleStatus(post)}
                                >
                                  {post.status === 'published' ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/blog/edit/${post.id}`)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDelete(post.id)}
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
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
