/**
 * User Panel Control Page
 * 
 * Admin interface for controlling visibility of user panel pages.
 * Allows admin to toggle ON/OFF specific pages in the user dashboard.
 * 
 * Features:
 * - Toggle switches for all user panel pages
 * - Real-time updates to Firestore
 * - Visual feedback on changes
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { Shield, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import {
  getUserPanelControls,
  updateUserPanelControls,
  subscribeToUserPanelControls,
  pageDisplayNames,
  defaultUserPanelControls,
  type UserPanelControls,
} from '@/lib/firebase/systemSettings';

// Define page order for display
const pageOrder: string[] = [
  'dashboard',
  'tasks',
  'myTasks',
  'wallet',
  'withdraw',
  'referral',
  'friendLeaderboard',
  'rewards',
  'rewardAds',
  'leaderboard',
  'contest',
  'downloadApp',
  'support',
  'profile',
  'quickLinks',
  'login',
  'signUp',
  'blog',
  'howItWorks',
  'contact',
  'legal',
  'privacyPolicy',
  'termsOfService',
  'aboutUs',
];

export default function UserPanelControlPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [controls, setControls] = useState<UserPanelControls>(defaultUserPanelControls);
  const [originalControls, setOriginalControls] = useState<UserPanelControls>(defaultUserPanelControls);
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
      const unsubscribe = subscribeToUserPanelControls((newControls: UserPanelControls) => {
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
      const settings = await getUserPanelControls();
      setControls(settings);
      setOriginalControls(settings);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (pageKey: string) => {
    setControls((prev: UserPanelControls) => ({
      ...prev,
      [pageKey]: !prev[pageKey],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await updateUserPanelControls(controls);
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

  const handleResetToDefaults = async () => {
    if (confirm('Are you sure you want to reset all pages to enabled?')) {
      setIsSaving(true);
      try {
        await updateUserPanelControls(defaultUserPanelControls);
        setControls(defaultUserPanelControls);
        setOriginalControls(defaultUserPanelControls);
        setMessage({ type: 'success', text: 'All pages reset to enabled!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to reset settings.' });
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Count enabled and disabled pages
  const enabledCount = Object.values(controls).filter(Boolean).length;
  const disabledCount = pageOrder.length - enabledCount;

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
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">User Panel Control</h1>
        </div>
        <p className="text-gray-600">
          Control which pages are visible in the user dashboard. Toggle switches to enable or disable specific pages.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">Enabled Pages</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{enabledCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-red-500" />
                <span className="text-sm text-gray-600">Disabled Pages</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{disabledCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Page Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle>Page Visibility Controls</CardTitle>
          <CardDescription>
            Toggle pages ON to make them visible to users, OFF to hide them from navigation and block direct access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pageOrder.map((pageKey) => (
              <div
                key={pageKey}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {controls[pageKey] ? (
                    <Eye className="h-5 w-5 text-green-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900">
                    {pageDisplayNames[pageKey] || pageKey}
                  </span>
                </div>
                <Switch
                  checked={controls[pageKey] || false}
                  onCheckedChange={() => handleToggle(pageKey)}
                />
              </div>
            ))}
          </div>
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
        
        <Button
          variant="ghost"
          onClick={handleResetToDefaults}
          disabled={isSaving}
          className="text-gray-600 hover:text-gray-900"
        >
          Reset to Defaults
        </Button>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>When a page is <strong>OFF</strong>, it will be hidden from the sidebar navigation</li>
          <li>Users trying to access a disabled page directly will be redirected to the dashboard</li>
          <li>Changes take effect immediately after saving</li>
          <li>Default behavior: all pages are enabled if settings document doesn&apos;t exist</li>
        </ul>
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}
