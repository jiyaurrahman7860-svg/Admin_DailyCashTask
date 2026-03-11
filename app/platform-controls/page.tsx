/**
 * Platform Controls Page
 * 
 * Admin interface for controlling core platform features.
 * Allows admin to manage maintenance mode, announcements, task system, and withdraw system.
 * 
 * Features:
 * - Maintenance Mode toggle
 * - Global Announcement Bar with message input
 * - Task System toggle
 * - Withdraw System toggle
 * - Protected admin-only access
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { Settings, Save, RefreshCw, AlertTriangle, Megaphone, ClipboardList, Wallet } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import {
  getPlatformControls,
  updatePlatformControls,
  subscribeToPlatformControls,
  defaultPlatformControls,
  type PlatformControls,
} from '@/lib/firebase/systemSettings';

export default function PlatformControlsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [controls, setControls] = useState<PlatformControls>(defaultPlatformControls);
  const [originalControls, setOriginalControls] = useState<PlatformControls>(defaultPlatformControls);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [hasChanges, setHasChanges] = useState(false);

  // Check admin access
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Check user role
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

  // Load initial settings and subscribe to real-time updates
  useEffect(() => {
    if (user && userRole === 'admin') {
      loadSettings();
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToPlatformControls((newControls: PlatformControls) => {
        setControls(newControls);
        setOriginalControls(newControls);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, userRole]);

  // Check for changes whenever controls update
  useEffect(() => {
    const changed = JSON.stringify(controls) !== JSON.stringify(originalControls);
    setHasChanges(changed);
  }, [controls, originalControls]);

  const loadSettings = async () => {
    try {
      const settings = await getPlatformControls();
      setControls(settings);
      setOriginalControls(settings);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof PlatformControls) => {
    setControls((prev: PlatformControls) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMessageChange = (value: string) => {
    setControls((prev: PlatformControls) => ({
      ...prev,
      announcementMessage: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await updatePlatformControls(controls);
      setOriginalControls(controls);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setControls(originalControls);
    setMessage({ type: '', text: '' });
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

  if (!user || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Platform Controls</h1>
        </div>
        <p className="text-gray-600">
          Control core platform features including maintenance mode, global announcements, task system, and withdraw system.
        </p>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Maintenance Mode Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                When enabled, the entire user website becomes unavailable and redirects to a maintenance page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {controls.maintenanceMode ? 'Maintenance Mode is ON' : 'Maintenance Mode is OFF'}
              </p>
              <p className="text-sm text-gray-600">
                {controls.maintenanceMode 
                  ? 'User website is currently unavailable' 
                  : 'User website is accessible'}
              </p>
            </div>
            <Switch
              checked={controls.maintenanceMode || false}
              onCheckedChange={() => handleToggle('maintenanceMode')}
            />
          </div>
          {controls.maintenanceMode && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Users will be redirected to /maintenance page. Only admin panel remains accessible.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Announcement Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Megaphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Global Announcement</CardTitle>
              <CardDescription>
                Display an announcement banner across the entire user website.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Announcement Status</p>
              <p className="text-sm text-gray-600">
                {controls.announcementEnabled ? 'Banner is visible' : 'Banner is hidden'}
              </p>
            </div>
            <Switch
              checked={controls.announcementEnabled || false}
              onCheckedChange={() => handleToggle('announcementEnabled')}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Announcement Message</label>
            <Input
              value={controls.announcementMessage || ''}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder="Enter announcement message..."
              disabled={!controls.announcementEnabled}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              This message will appear in the announcement banner at the top of the site.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Task System Control Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Task System</CardTitle>
              <CardDescription>
                Enable or disable the entire task completion system.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {controls.tasksSystemEnabled ? 'Task System is ON' : 'Task System is OFF'}
              </p>
              <p className="text-sm text-gray-600">
                {controls.tasksSystemEnabled 
                  ? 'Users can access and complete tasks' 
                  : 'Task pages are hidden and unavailable'}
              </p>
            </div>
            <Switch
              checked={controls.tasksSystemEnabled || false}
              onCheckedChange={() => handleToggle('tasksSystemEnabled')}
            />
          </div>
          {!controls.tasksSystemEnabled && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Users will see: &quot;Tasks are temporarily unavailable. Please check back later.&quot;
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw System Control Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Withdraw System</CardTitle>
              <CardDescription>
                Enable or disable user withdrawals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {controls.withdrawSystemEnabled ? 'Withdraw System is ON' : 'Withdraw System is OFF'}
              </p>
              <p className="text-sm text-gray-600">
                {controls.withdrawSystemEnabled 
                  ? 'Users can request withdrawals' 
                  : 'Withdrawals are temporarily disabled'}
              </p>
            </div>
            <Switch
              checked={controls.withdrawSystemEnabled || false}
              onCheckedChange={() => handleToggle('withdrawSystemEnabled')}
            />
          </div>
          {!controls.withdrawSystemEnabled && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Users will see: &quot;Withdrawals are temporarily disabled.&quot;
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mt-6">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        
        {hasChanges && (
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            Cancel Changes
          </Button>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How Platform Controls work:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Maintenance Mode:</strong> Redirects all user traffic to /maintenance page. Admin panel stays accessible.</li>
          <li><strong>Global Announcement:</strong> Shows a banner at the top of every page with your custom message.</li>
          <li><strong>Task System:</strong> When OFF, hides Tasks, My Tasks, and Rewards pages from users.</li>
          <li><strong>Withdraw System:</strong> When OFF, blocks new withdrawal requests while preserving existing history.</li>
          <li>Changes take effect immediately after saving across all user sessions.</li>
        </ul>
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}
