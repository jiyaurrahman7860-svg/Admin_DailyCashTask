'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { 
  Mail, 
  Trash2, 
  CheckCircle, 
  Search,
  RefreshCw,
  MessageSquare,
  Calendar,
  User,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Send,
  Clock,
  ArrowLeft
} from 'lucide-react'

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'read' | 'replied'
  createdAt: string
  source: string
}

const formatDistanceToNow = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ContactMessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }
      loadMessages()
    })
    return () => unsubscribe()
  }, [router])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, 'contactMessages'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactMessage[]
      setMessages(msgs)
    } catch (error) {
      console.error('Error loading messages:', error)
      alert('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'contactMessages', id), {
        status: 'read'
      })
      setMessages(messages.map(m => m.id === id ? { ...m, status: 'read' } : m))
      alert('Marked as read')
    } catch (error) {
      alert('Failed to update status')
    }
  }

  const markAsReplied = async (id: string) => {
    try {
      await updateDoc(doc(db, 'contactMessages', id), {
        status: 'replied'
      })
      setMessages(messages.map(m => m.id === id ? { ...m, status: 'replied' } : m))
    } catch (error) {
      alert('Failed to update status')
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      await deleteDoc(doc(db, 'contactMessages', id))
      setMessages(messages.filter(m => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)
      alert('Message deleted')
    } catch (error) {
      alert('Failed to delete message')
    }
  }

  const filteredMessages = messages.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filter === 'all' || m.status === filter
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: messages.length,
    new: messages.filter(m => m.status === 'new').length,
    read: messages.filter(m => m.status === 'read').length,
    replied: messages.filter(m => m.status === 'replied').length
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-red-500">New</Badge>
      case 'read':
        return <Badge variant="secondary">Read</Badge>
      case 'replied':
        return <Badge className="bg-green-500">Replied</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen bg-gray-50/50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Contact Messages</h1>
                    <p className="text-sm text-gray-500">
                      {stats.new > 0 ? (
                        <span className="text-red-600 font-medium">{stats.new} new messages</span>
                      ) : (
                        'No new messages'
                      )} from landing page
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={loadMessages}
                  className="gap-2 hover:bg-gray-100"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFilter('all')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Inbox className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      <p className="text-sm text-gray-500">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`border-0 shadow-sm cursor-pointer transition-all ${filter === 'new' ? 'ring-2 ring-red-500 bg-red-50' : 'bg-white hover:shadow-md'}`}
                onClick={() => setFilter(filter === 'new' ? 'all' : 'new')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.new}</p>
                      <p className="text-sm text-gray-500">New</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`border-0 shadow-sm cursor-pointer transition-all ${filter === 'read' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-white hover:shadow-md'}`}
                onClick={() => setFilter(filter === 'read' ? 'all' : 'read')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{stats.read}</p>
                      <p className="text-sm text-gray-500">Read</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`border-0 shadow-sm cursor-pointer transition-all ${filter === 'replied' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-white hover:shadow-md'}`}
                onClick={() => setFilter(filter === 'replied' ? 'all' : 'replied')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{stats.replied}</p>
                      <p className="text-sm text-gray-500">Replied</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {filter !== 'all' && (
                <Button 
                  variant="ghost" 
                  onClick={() => setFilter('all')}
                  className="gap-2 text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Clear Filter
                </Button>
              )}
            </div>

            {/* Messages List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* List */}
                <div className="space-y-3">
                  {filteredMessages.length === 0 ? (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No messages found</h3>
                        <p className="text-gray-500">
                          {searchQuery ? 'Try adjusting your search' : 'Messages from landing page will appear here'}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredMessages.map((message) => (
                      <Card
                        key={message.id}
                        className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                          selectedMessage?.id === message.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50/50' 
                            : message.status === 'new' 
                              ? 'bg-white border-l-4 border-l-red-500' 
                              : 'bg-white'
                        }`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.status === 'new' 
                                ? 'bg-red-100' 
                                : message.status === 'read'
                                  ? 'bg-amber-100'
                                  : 'bg-emerald-100'
                            }`}>
                              <User className={`w-5 h-5 ${
                                message.status === 'new' 
                                  ? 'text-red-600' 
                                  : message.status === 'read'
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 truncate">{message.name}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-sm text-gray-500">{formatDistanceToNow(message.createdAt)}</span>
                              </div>
                              
                              <p className="text-sm text-gray-900 font-medium truncate mb-1">{message.subject}</p>
                              <p className="text-sm text-gray-500 truncate">{message.message}</p>
                              
                              <div className="flex items-center gap-2 mt-2">
                                {message.status === 'new' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                    New
                                  </span>
                                )}
                                {message.status === 'read' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                    Read
                                  </span>
                                )}
                                {message.status === 'replied' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Replied
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              {message.status === 'new' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-green-600 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(message.id)
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteMessage(message.id)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Detail View */}
                <div>
                  {selectedMessage ? (
                    <Card className="border-0 shadow-lg sticky top-20">
                      <CardContent className="p-0">
                        {/* Header */}
                        <div className="border-b border-gray-100 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                selectedMessage.status === 'new' 
                                  ? 'bg-red-100' 
                                  : selectedMessage.status === 'read'
                                    ? 'bg-amber-100'
                                    : 'bg-emerald-100'
                              }`}>
                                <User className={`w-6 h-6 ${
                                  selectedMessage.status === 'new' 
                                    ? 'text-red-600' 
                                    : selectedMessage.status === 'read'
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                }`} />
                              </div>
                              <div>
                                <h2 className="text-lg font-semibold text-gray-900">{selectedMessage.name}</h2>
                                <p className="text-sm text-gray-500">{selectedMessage.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {selectedMessage.status === 'new' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsRead(selectedMessage.id)}
                                  className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMessage(selectedMessage.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(selectedMessage.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDistanceToNow(selectedMessage.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="p-6 space-y-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                              Subject
                            </label>
                            <h3 className="text-lg font-medium text-gray-900">{selectedMessage.subject}</h3>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                              Message
                            </label>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                              {selectedMessage.message}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                          <Button
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              window.open(`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`)
                              markAsReplied(selectedMessage.id)
                            }}
                          >
                            <Mail className="w-4 h-4" />
                            Reply via Email
                            <Send className="w-4 h-4 ml-auto" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-0 shadow-sm sticky top-20">
                      <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Select a message</h3>
                        <p className="text-gray-500">Click on a message to view details and reply</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
