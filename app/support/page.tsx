'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, where, getDoc, addDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageCircle, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  Mail,
  Check
} from 'lucide-react'
import { format } from 'date-fns'

interface Ticket {
  id: string
  userId: string
  email: string
  subject: string
  message: string
  screenshot?: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface TicketReply {
  id: string
  userId: string
  isAdmin: boolean
  message: string
  createdAt: Timestamp
}

export default function SupportTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketReplies, setTicketReplies] = useState<Record<string, TicketReply[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
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

      // Subscribe to tickets
      const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'))
      
      const unsubscribeTickets = onSnapshot(q, (snapshot) => {
        const ticketData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Ticket))
        setTickets(ticketData)
        setLoading(false)
      })

      return () => unsubscribeTickets()
    })

    return () => unsubscribe()
  }, [router])

  // Load replies when ticket expanded
  useEffect(() => {
    if (!expandedTicket) return

    const repliesQuery = query(
      collection(db, 'supportTickets', expandedTicket, 'replies'),
      orderBy('createdAt', 'asc')
    )
    
    const unsubscribeReplies = onSnapshot(repliesQuery, (snapshot) => {
      const replies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketReply[]
      setTicketReplies(prev => ({ ...prev, [expandedTicket]: replies }))
    })

    return () => unsubscribeReplies()
  }, [expandedTicket])

  const handleReply = async (ticketId: string) => {
    if (!replyMessage.trim()) return

    const replyRef = collection(db, 'supportTickets', ticketId, 'replies')
    
    await addDoc(replyRef, {
      userId: auth.currentUser?.uid,
      isAdmin: true,
      message: replyMessage,
      createdAt: Timestamp.now()
    })

    // Update ticket status
    const ticketRef = doc(db, 'supportTickets', ticketId)
    await updateDoc(ticketRef, {
      status: 'in_progress',
      updatedAt: Timestamp.now()
    })

    setReplyMessage('')
  }

  const updateStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    const ticketRef = doc(db, 'supportTickets', ticketId)
    await updateDoc(ticketRef, {
      status,
      updatedAt: Timestamp.now()
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Open</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">In Progress</Badge>
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Resolved</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-black">Support Tickets</h1>
                <p className="text-gray-500">Manage user support requests</p>
              </div>
              <div className="flex gap-2">
                <div className="bg-white px-4 py-2 rounded-lg border">
                  <span className="text-sm text-gray-500">Open: </span>
                  <span className="font-semibold">{tickets.filter(t => t.status === 'open').length}</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border">
                  <span className="text-sm text-gray-500">In Progress: </span>
                  <span className="font-semibold">{tickets.filter(t => t.status === 'in_progress').length}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All Tickets</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>

              {['all', 'open', 'in_progress', 'resolved'].map((status) => (
                <TabsContent key={status} value={status} className="mt-0">
                  <div className="space-y-4">
                    {tickets
                      .filter((ticket) => status === 'all' || ticket.status === status)
                      .map((ticket) => (
                        <Card key={ticket.id} className="overflow-hidden">
                          <div
                            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedTicket(
                              expandedTicket === ticket.id ? null : ticket.id
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {getStatusBadge(ticket.status)}
                                  <span className="text-sm text-gray-500">
                                    {ticket.createdAt?.toDate && 
                                      format(ticket.createdAt.toDate(), 'MMM d, yyyy h:mm a')
                                    }
                                  </span>
                                  <span className="text-sm text-gray-400">|</span>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <User className="w-4 h-4" />
                                    {ticket.userId}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    {ticket.email}
                                  </div>
                                </div>
                                <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                <p className="text-xs text-gray-400 font-mono mt-1">Ticket ID: {ticket.id}</p>
                                <p className="text-gray-600 mt-1">{ticket.message}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {ticketReplies[ticket.id]?.length > 0 && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {ticketReplies[ticket.id].length}
                                  </Badge>
                                )}
                                {expandedTicket === ticket.id ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {expandedTicket === ticket.id && (
                            <div className="border-t bg-gray-50 p-6">
                              {ticket.screenshot && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2">Screenshot:</p>
                                  <img
                                    src={ticket.screenshot}
                                    alt="Ticket screenshot"
                                    className="max-w-md rounded-lg border"
                                  />
                                </div>
                              )}

                              {/* Conversation */}
                              <div className="space-y-3 mb-6">
                                <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
                                  Conversation
                                </h4>
                                
                                {/* Original Message */}
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-white border rounded-lg p-3">
                                      <p className="text-sm">{ticket.message}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {ticket.createdAt?.toDate && 
                                        format(ticket.createdAt.toDate(), 'MMM d, h:mm a')
                                      }
                                    </p>
                                  </div>
                                </div>

                                {/* Replies */}
                                {ticketReplies[ticket.id]?.map((reply: TicketReply) => (
                                  <div key={reply.id} className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      reply.isAdmin ? 'bg-primary' : 'bg-gray-200'
                                    }`}>
                                      {reply.isAdmin ? (
                                        <CheckCircle className="w-4 h-4 text-white" />
                                      ) : (
                                        <User className="w-4 h-4 text-gray-600" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className={`rounded-lg p-3 ${
                                        reply.isAdmin ? 'bg-primary/10' : 'bg-white border'
                                      }`}>
                                        <p className="text-sm font-medium mb-1">
                                          {reply.isAdmin ? 'Support Team' : 'User'}
                                        </p>
                                        <p className="text-sm">{reply.message}</p>
                                      </div>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {reply.createdAt?.toDate && 
                                          format(reply.createdAt.toDate(), 'MMM d, h:mm a')
                                        }
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Reply Form */}
                              {ticket.status !== 'resolved' && (
                                <div className="flex gap-2 mb-4">
                                  <Textarea
                                    placeholder="Type your reply..."
                                    value={replyMessage}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyMessage(e.target.value)}
                                    className="flex-1 resize-none"
                                    rows={2}
                                  />
                                  <Button 
                                    onClick={() => handleReply(ticket.id)}
                                    className="bg-primary hover:bg-primary/90"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}

                              {/* Status Actions */}
                              <div className="flex gap-2">
                                {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && (
                                  <Button
                                    variant="outline"
                                    onClick={() => updateStatus(ticket.id, 'in_progress')}
                                    className="flex items-center gap-2"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Mark In Progress
                                  </Button>
                                )}
                                {ticket.status !== 'resolved' && (
                                  <Button
                                    variant="outline"
                                    onClick={() => updateStatus(ticket.id, 'resolved')}
                                    className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Check className="w-4 h-4" />
                                    Resolve Ticket
                                  </Button>
                                )}
                                {ticket.status === 'resolved' && (
                                  <Button
                                    variant="outline"
                                    onClick={() => updateStatus(ticket.id, 'open')}
                                    className="flex items-center gap-2"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                    Reopen Ticket
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}

                    {tickets.filter((ticket) => status === 'all' || ticket.status === status).length === 0 && (
                      <div className="text-center py-12 bg-white rounded-lg border">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No tickets found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {status === 'all' ? 'No support tickets yet' : `No ${status.replace('_', ' ')} tickets`}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
