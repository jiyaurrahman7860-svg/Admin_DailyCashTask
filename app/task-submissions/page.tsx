'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { CheckCircle, XCircle, Clock, User, FileText, CheckCheck, Ban } from 'lucide-react'

interface TaskSubmission {
  id: string
  taskId: string
  userId: string
  userEmail: string
  proofData: string
  proofType: string
  status: 'pending' | 'approved' | 'rejected'
  reward: number
  createdAt: any
  taskTitle: string
  reviewedAt?: any
  reviewedBy?: string
  rejectionReason?: string
}

export default function TaskSubmissionsPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const q = query(collection(db, 'taskSubmissions'), orderBy('createdAt', 'desc'))
      const unsubscribeSubmissions = onSnapshot(q, (snapshot) => {
        const submissionList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TaskSubmission[]
        setSubmissions(submissionList)
        setLoading(false)
      })

      return () => unsubscribeSubmissions()
    })

    return () => unsubscribe()
  }, [router])

  const handleApprove = async (submission: TaskSubmission) => {
    setProcessingId(submission.id)
    try {
      const user = auth.currentUser
      if (!user) return

      // Update submission status
      await updateDoc(doc(db, 'taskSubmissions', submission.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.email
      })

      // Get user document
      const userDoc = await getDoc(doc(db, 'users', submission.userId))
      if (userDoc.exists()) {
        const currentBalance = userDoc.data().walletBalance || 0
        const currentEarned = userDoc.data().totalEarned || 0
        const currentTasksCompleted = userDoc.data().tasksCompleted || 0

        // Update user wallet
        await updateDoc(doc(db, 'users', submission.userId), {
          walletBalance: currentBalance + submission.reward,
          totalEarned: currentEarned + submission.reward,
          tasksCompleted: currentTasksCompleted + 1
        })

        // Create transaction record
        await updateDoc(doc(db, 'transactions', `${submission.id}_reward`), {
          userId: submission.userId,
          type: 'task_reward',
          amount: submission.reward,
          status: 'completed',
          description: `Reward for task: ${submission.taskTitle}`,
          createdAt: serverTimestamp()
        })
      }

      alert('Submission approved and reward added to user wallet!')
    } catch (error) {
      console.error('Error approving submission:', error)
      alert('Failed to approve submission')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (submission: TaskSubmission) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    setProcessingId(submission.id)
    try {
      const user = auth.currentUser
      if (!user) return

      await updateDoc(doc(db, 'taskSubmissions', submission.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.email,
        rejectionReason: reason
      })

      alert('Submission rejected!')
    } catch (error) {
      console.error('Error rejecting submission:', error)
      alert('Failed to reject submission')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString()
    }
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black flex items-center">
                <CheckCircle className="w-6 h-6 mr-2" />
                Task Submissions
              </h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Submissions</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Submissions Table */}
            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Task</th>
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Proof</th>
                        <th className="text-left py-3 px-4">Reward</th>
                        <th className="text-left py-3 px-4">Submitted</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((submission) => (
                        <tr key={submission.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{submission.taskTitle}</p>
                              <p className="text-xs text-gray-500">ID: {submission.taskId.slice(0, 8)}...</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <p className="text-sm">{submission.userEmail}</p>
                                <p className="text-xs text-gray-500">ID: {submission.userId.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Type: <span className="font-medium capitalize">{submission.proofType}</span>
                              </p>
                              <p className="text-sm max-w-xs truncate" title={submission.proofData}>
                                {submission.proofData}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600">₹{submission.reward}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-600">{formatDate(submission.createdAt)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {submission.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                              {submission.status === 'approved' && <CheckCheck className="w-3 h-3 inline mr-1" />}
                              {submission.status === 'rejected' && <Ban className="w-3 h-3 inline mr-1" />}
                              {submission.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {submission.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApprove(submission)}
                                  disabled={processingId === submission.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingId === submission.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReject(submission)}
                                  disabled={processingId === submission.id}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {submission.status === 'approved' ? (
                                  <span className="text-green-600">
                                    <CheckCheck className="w-4 h-4 inline mr-1" />
                                    Approved
                                  </span>
                                ) : (
                                  <span className="text-red-600">
                                    <Ban className="w-4 h-4 inline mr-1" />
                                    Rejected
                                    {submission.rejectionReason && (
                                      <p className="text-xs mt-1 max-w-xs" title={submission.rejectionReason}>
                                        Reason: {submission.rejectionReason.slice(0, 30)}...
                                      </p>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {submissions.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No submissions yet</p>
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
