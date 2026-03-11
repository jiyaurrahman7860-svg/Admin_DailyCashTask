/**
 * Weekly Contest Management Page
 * 
 * Admin interface for managing weekly earning contests.
 * Allows admin to create contests, view participants, and manage winners.
 * 
 * Features:
 * - Create new weekly contests with prize pools
 * - View current/past contests
 * - See top earners and participants
 * - Declare winners and distribute prizes
 * - View contest statistics
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
  limit 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Users, 
  IndianRupee, 
  RefreshCw, 
  Crown,
  Target,
  Clock,
  ChevronRight,
  X,
  Save,
  Trash2,
  Award,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface Contest {
  id: string;
  title: string;
  description: string;
  prizePool: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'active' | 'completed' | 'upcoming';
  participants: number;
  createdAt: Timestamp;
  prizes: {
    rank1: number;
    rank2: number;
    rank3: number;
    rank4: number;
    rank5: number;
    rank6to10: number;
  };
}

interface ContestWinner {
  id: string;
  contestId: string;
  userId: string;
  userName: string;
  rank: number;
  prize: number;
  weeklyEarnings: number;
  claimed: boolean;
  createdAt: Timestamp;
}

interface TopEarner {
  userId: string;
  userName: string;
  weeklyEarnings: number;
  rank: number;
}

export default function ContestManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [winners, setWinners] = useState<ContestWinner[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });
  
  // Form states
  const [formData, setFormData] = useState({
    title: 'Weekly Earning Contest',
    description: 'Top 10 winners share a prize pool!',
    prizePool: 5000,
    duration: 7, // days
    prizes: {
      rank1: 1000,
      rank2: 500,
      rank3: 300,
      rank4: 200,
      rank5: 100,
      rank6to10: 50,
    }
  });

  // Check admin access
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        router.push('/login');
        return;
      }

      setUserRole(userData.role);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load contests
  useEffect(() => {
    if (user && userRole === 'admin') {
      const q = query(
        collection(db, 'weeklyContests'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const contestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Contest[];
        setContests(contestsData);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, userRole]);

  // Load winners when contest is selected
  useEffect(() => {
    if (selectedContest) {
      const q = query(
        collection(db, 'contestWinners'),
        where('contestId', '==', selectedContest.id),
        orderBy('rank', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const winnersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ContestWinner[];
        setWinners(winnersData);
      });

      return () => unsubscribe();
    }
  }, [selectedContest]);

  const handleCreateContest = async () => {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + formData.duration);

      await addDoc(collection(db, 'weeklyContests'), {
        title: formData.title,
        description: formData.description,
        prizePool: formData.prizePool,
        startDate: Timestamp.fromDate(now),
        endDate: Timestamp.fromDate(endDate),
        status: 'active',
        participants: 0,
        createdAt: Timestamp.now(),
        prizes: formData.prizes,
      });

      setMessage({ type: 'success', text: 'Contest created successfully!' });
      setShowCreateModal(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create contest' });
    }
  };

  const handleDeleteContest = async (contestId: string) => {
    if (confirm('Are you sure you want to delete this contest?')) {
      try {
        await deleteDoc(doc(db, 'weeklyContests', contestId));
        setMessage({ type: 'success', text: 'Contest deleted!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete contest' });
      }
    }
  };

  const getDaysLeft = (endDate: Timestamp) => {
    const end = endDate.toDate();
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'upcoming':
        return <Badge className="bg-yellow-100 text-yellow-800">Upcoming</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Weekly Contest Management</h1>
                    <p className="text-gray-600">Create and manage weekly earning contests</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contest
                </Button>
              </div>
            </div>

            {/* Alert Messages */}
            {message.text && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Contests</p>
                      <p className="text-2xl font-bold">{contests.length}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Contests</p>
                      <p className="text-2xl font-bold">
                        {contests.filter(c => c.status === 'active').length}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Prize Pool</p>
                      <p className="text-2xl font-bold">
                        ₹{contests.reduce((sum, c) => sum + c.prizePool, 0).toLocaleString()}
                      </p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Winners</p>
                      <p className="text-2xl font-bold">{winners.length}</p>
                    </div>
                    <Crown className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contests List */}
            <Card>
              <CardHeader>
                <CardTitle>All Contests</CardTitle>
                <CardDescription>Manage your weekly earning contests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contests.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No contests created yet</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Contest
                      </Button>
                    </div>
                  ) : (
                    contests.map((contest) => (
                      <div
                        key={contest.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{contest.title}</h3>
                            {getStatusBadge(contest.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{contest.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-4 w-4" />
                              Prize Pool: ₹{contest.prizePool.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {contest.participants} Participants
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {getDaysLeft(contest.endDate)} days left
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedContest(contest);
                              setShowWinnersModal(true);
                            }}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Winners
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContest(contest.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create Contest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Weekly Contest</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Set up a new weekly earning contest with prize distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Contest Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter contest title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prizePool">Prize Pool (₹)</Label>
                  <Input
                    id="prizePool"
                    type="number"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Prize Distribution</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>1st Prize (₹)</Label>
                    <Input
                      type="number"
                      value={formData.prizes.rank1}
                      onChange={(e) => setFormData({
                        ...formData,
                        prizes: { ...formData.prizes, rank1: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>2nd Prize (₹)</Label>
                    <Input
                      type="number"
                      value={formData.prizes.rank2}
                      onChange={(e) => setFormData({
                        ...formData,
                        prizes: { ...formData.prizes, rank2: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>3rd Prize (₹)</Label>
                    <Input
                      type="number"
                      value={formData.prizes.rank3}
                      onChange={(e) => setFormData({
                        ...formData,
                        prizes: { ...formData.prizes, rank3: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>4th Prize (₹)</Label>
                    <Input
                      type="number"
                      value={formData.prizes.rank4}
                      onChange={(e) => setFormData({
                        ...formData,
                        prizes: { ...formData.prizes, rank4: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>5th Prize (₹)</Label>
                    <Input
                      type="number"
                      value={formData.prizes.rank5}
                      onChange={(e) => setFormData({
                        ...formData,
                        prizes: { ...formData.prizes, rank5: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>6-10 Rank (₹ each)</Label>
                    <Input
                      type="number"
                      value={formData.prizes.rank6to10}
                      onChange={(e) => setFormData({
                        ...formData,
                        prizes: { ...formData.prizes, rank6to10: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleCreateContest}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Contest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Winners Modal */}
      {showWinnersModal && selectedContest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contest Winners</CardTitle>
                  <CardDescription>{selectedContest.title}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWinnersModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {winners.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No winners declared yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Winners will be automatically calculated when contest ends
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {winners.map((winner) => (
                    <div
                      key={winner.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          winner.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                          winner.rank === 2 ? 'bg-gray-100 text-gray-800' :
                          winner.rank === 3 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {winner.rank <= 3 ? (
                            <Crown className="h-5 w-5" />
                          ) : (
                            <span className="font-bold">#{winner.rank}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{winner.userName}</p>
                          <p className="text-sm text-gray-500">
                            Earnings: ₹{winner.weeklyEarnings.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{winner.prize.toLocaleString()}</p>
                        <Badge variant={winner.claimed ? 'default' : 'secondary'}>
                          {winner.claimed ? 'Claimed' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
