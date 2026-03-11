'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/firebaseConfig'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { ClipboardList, Plus, Trash2, Edit2, CheckCircle } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  reward: number
  proofRequired: string
  timeEstimate: string
  status: string
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  taskUrl?: string
  taskLimit?: number
  completedCount?: number
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward: '',
    category: 'general',
    difficulty: 'easy',
    proofRequired: 'screenshot',
    timeEstimate: '5 min',
    status: 'active',
    taskUrl: '',
    taskLimit: '50'
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
        const taskList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[]
        setTasks(taskList)
        setLoading(false)
      })

      return () => unsubscribeTasks()
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const taskData = {
      ...formData,
      reward: parseFloat(formData.reward),
      taskLimit: parseInt(formData.taskLimit) || 50,
      completedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData)
        alert('Task updated successfully!')
      } else {
        await addDoc(collection(db, 'tasks'), taskData)
        alert('Task created successfully!')
      }
      
      setFormData({
        title: '',
        description: '',
        reward: '',
        category: 'general',
        difficulty: 'easy',
        proofRequired: 'screenshot',
        timeEstimate: '5 min',
        status: 'active',
        taskUrl: '',
        taskLimit: '50'
      })
      setShowForm(false)
      setEditingTask(null)
    } catch (error) {
      alert('Failed to save task')
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      reward: task.reward.toString(),
      category: task.category || 'general',
      difficulty: task.difficulty || 'easy',
      proofRequired: task.proofRequired,
      timeEstimate: task.timeEstimate,
      status: task.status,
      taskUrl: task.taskUrl || '',
      taskLimit: (task.taskLimit || 50).toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId))
      alert('Task deleted successfully!')
    } catch (error) {
      alert('Failed to delete task')
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
                <ClipboardList className="w-6 h-6 mr-2" />
                Task Management
              </h1>
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus className="w-4 h-4 mr-2" />
                {showForm ? 'Cancel' : 'Add Task'}
              </Button>
            </div>

            {showForm && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingTask ? 'Edit Task' : 'Create New Task'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Task Title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Reward Amount (₹)"
                        value={formData.reward}
                        onChange={(e) => setFormData({...formData, reward: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="number"
                        placeholder="Task Limit (max users)"
                        value={formData.taskLimit}
                        onChange={(e) => setFormData({...formData, taskLimit: e.target.value})}
                        min="1"
                        required
                      />
                      <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm text-gray-600">Default: 50 users max</span>
                      </div>
                    </div>
                    <Input
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="general">General</option>
                        <option value="finance">Finance</option>
                        <option value="gaming">Gaming</option>
                        <option value="shopping">Shopping</option>
                        <option value="survey">Survey</option>
                        <option value="social">Social Media</option>
                      </select>
                      <select
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                        value={formData.difficulty}
                        onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <select
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                        value={formData.proofRequired}
                        onChange={(e) => setFormData({...formData, proofRequired: e.target.value})}
                      >
                        <option value="screenshot">Screenshot</option>
                        <option value="username">Username</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                    <Input
                      placeholder="Time Estimate (e.g., 5 min)"
                      value={formData.timeEstimate}
                      onChange={(e) => setFormData({...formData, timeEstimate: e.target.value})}
                    />
                    <Input
                      placeholder="Task URL (e.g., https://example.com/task)"
                      value={formData.taskUrl}
                      onChange={(e) => setFormData({...formData, taskUrl: e.target.value})}
                    />
                    <Button type="submit" className="w-full">
                      {editingTask ? 'Update Task' : 'Create Task'}
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
                        <th className="text-left py-3 px-4">Title</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-left py-3 px-4">Reward</th>
                        <th className="text-left py-3 px-4">Limit</th>
                        <th className="text-left py-3 px-4">Completed</th>
                        <th className="text-left py-3 px-4">Time</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id} className="border-b">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-gray-500">{task.difficulty}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-gray-100 rounded text-sm capitalize">
                              {task.category || 'general'}
                            </span>
                          </td>
                          <td className="py-3 px-4">₹{task.reward}</td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-700">
                              {task.taskLimit || 50} users
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-medium ${
                              (task.completedCount || 0) >= (task.taskLimit || 50) 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {task.completedCount || 0} / {task.taskLimit || 50}
                            </span>
                          </td>
                          <td className="py-3 px-4">{task.timeEstimate}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-sm ${
                              task.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(task)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(task.id)}
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
