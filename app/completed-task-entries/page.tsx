'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { CheckCircle, XCircle, Clock, User, FileText, CheckCheck, Ban, Users, Loader2, Eye } from 'lucide-react'

interface Task {
  id: string
  title: string
  reward: number
  taskLimit: number
  completedCount: number
  status: string
}

interface TaskSubmission {
  id: string
  taskId: string
  userId: string
  userEmail: string
  userName?: string
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

export default function CompletedTaskEntriesPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch tasks with real-time listener
      const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
        const taskList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[]
        setTasks(taskList)
      })

      // Fetch all submissions with real-time listener
      const q = query(collection(db, 'taskSubmissions'), orderBy('createdAt', 'desc'))
      const unsubscribeSubmissions = onSnapshot(q, (snapshot) => {
        const submissionList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TaskSubmission[]
        setSubmissions(submissionList)
        setLoading(false)
      })

      return () => {
        unsubscribeTasks()
        unsubscribeSubmissions()
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleApprove = async (submission: TaskSubmission) => {
    setProcessingId(submission.id)
    try {
      const user = auth.currentUser
      if (!user) return

      // Get submission data
      const submissionDoc = await getDoc(doc(db, 'taskSubmissions', submission.id))
      if (!submissionDoc.exists()) {
        alert('Submission not found')
        return
      }

      const submissionData = submissionDoc.data()
      if (submissionData.status !== 'pending') {
        alert('Submission already processed')
        return
      }

      // Check task limit
      const taskDoc = await getDoc(doc(db, 'tasks', submission.taskId))
      if (taskDoc.exists()) {
        const taskData = taskDoc.data()
        const currentCompleted = taskData.completedCount || 0
        const taskLimit = taskData.taskLimit || 50

        if (currentCompleted >= taskLimit) {
          alert('Task limit has been reached. Cannot approve more submissions.')
          setProcessingId(null)
          return
        }
      }

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

        // Increment task completed count
        if (taskDoc.exists()) {
          const currentCompleted = taskDoc.data().completedCount || 0
          await updateDoc(doc(db, 'tasks', submission.taskId), {
            completedCount: currentCompleted + 1
          })
        }
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

  // Get submissions for a specific task
  const getTaskSubmissions = (taskId: string) => {
    return submissions.filter(s => s.taskId === taskId)
  }

  // Get pending count for a task
  const getPendingCount = (taskId: string) => {
    return submissions.filter(s => s.taskId === taskId && s.status === 'pending').length
  }

  // Get approved count for a task - DYNAMIC calculation from submissions (REAL-TIME)
  const getApprovedCount = (taskId: string) => {
    return submissions.filter(s => s.taskId === taskId && s.status === 'approved').length
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
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-black flex items-center">
                <Users className="w-6 h-6 mr-2" />
                Completed Task Entries
              </h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <p className="text-2xl font-bold">{tasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Submissions</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.status === 'pending').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.status === 'approved').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Task Cards with Submissions */}
            <div className="space-y-6">
              {tasks.map((task) => {
                const taskSubmissions = getTaskSubmissions(task.id)
                const pendingCount = getPendingCount(task.id)
                const approvedCount = getApprovedCount(task.id) // REAL-TIME count
                const isExpanded = selectedTask === task.id

                return (
                  <Card key={task.id} className="overflow-hidden">
                    {/* Task Header */}
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-green-600 font-medium">₹{task.reward}</span>
                              <span className="text-sm text-gray-500">|</span>
                              <span className="text-sm text-gray-600">
                                Limit: <span className="font-medium">{task.taskLimit || 50} users</span>
                              </span>
                              <span className="text-sm text-gray-500">|</span>
                              <span className={`text-sm font-medium ${
                                approvedCount >= (task.taskLimit || 50)
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}>
                                Completed: {approvedCount} / {task.taskLimit || 50}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {pendingCount > 0 && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                              {pendingCount} pending
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            task.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {task.status}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTask(isExpanded ? null : task.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {isExpanded ? 'Hide' : 'View'} Entries
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Task Completion Progress</span>
                          <span>{Math.round((approvedCount / (task.taskLimit || 50)) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              approvedCount >= (task.taskLimit || 50)
                                ? 'bg-red-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((approvedCount / (task.taskLimit || 50)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>

                    {/* Submissions List */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50">
                        <CardContent className="p-6">
                          {taskSubmissions.length === 0 ? (
                            <div className="text-center py-8">
                              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">No submissions yet for this task</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-900 mb-4">
                                Submissions ({taskSubmissions.length})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">User</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Proof</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Submitted</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Status</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {taskSubmissions.map((submission) => (
                                      <tr key={submission.id} className="border-b hover:bg-white">
                                        <td className="py-3 px-3">
                                          <div className="flex items-center">
                                            <User className="w-4 h-4 mr-2 text-gray-400" />
                                            <div>
                                              <p className="text-sm font-medium">{submission.userEmail}</p>
                                              <p className="text-xs text-gray-500">ID: {submission.userId.slice(0, 8)}...</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div>
                                            <p className="text-xs text-gray-500 mb-1">
                                              Type: <span className="font-medium capitalize">{submission.proofType}</span>
                                            </p>
                                            <p className="text-sm max-w-xs truncate" title={submission.proofData}>
                                              {submission.proofData}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <p className="text-sm text-gray-600">{formatDate(submission.createdAt)}</p>
                                        </td>
                                        <td className="py-3 px-3">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
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
                                        <td className="py-3 px-3">
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
                                                  <Loader2 className="w-4 h-4 animate-spin" />
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
                            </div>
                          )}
                        </CardContent>
                      </div>
                    )}
                  </Card>
                )
              })}

              {tasks.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No tasks found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
