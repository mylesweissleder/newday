import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DocumentsTab from '../components/DocumentsTab';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePic?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  role: string;
  skills?: UserSkill[];
  account: {
    id: string;
    name: string;
    email: string;
  };
}

interface UserSkill {
  id: string;
  skillId: string;
  type: 'ASK' | 'HAVE';
  proficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isActive: boolean;
  notes?: string;
  skill: {
    id: string;
    name: string;
    category?: string;
    description?: string;
  };
}

interface Skill {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

interface AccountInfo {
  id: string;
  name: string;
  email: string;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  }>;
  _count: {
    contacts: number;
    campaigns: number;
  };
}

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'skills' | 'documents' | 'account' | 'security'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    bio: '',
    phone: '',
    timezone: ''
  });

  // Skills state
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState({
    skillName: '',
    type: 'ASK' as 'ASK' | 'HAVE',
    proficiency: undefined as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | undefined,
    notes: ''
  });
  const [showAddSkill, setShowAddSkill] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Account form state
  const [accountForm, setAccountForm] = useState({
    name: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com';

  useEffect(() => {
    fetchProfile();
    fetchAvailableSkills();
    if (user?.role === 'ADMIN') {
      fetchAccountInfo();
    }
  }, [user]);

  const fetchAvailableSkills = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/skills/available`, {
        credentials: 'include'
      });
      if (response.ok) {
        const skillsData = await response.json();
        setAvailableSkills(skillsData);
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    }
  };

  const addUserSkill = async () => {
    if (!newSkill.skillName.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          skillName: newSkill.skillName,
          type: newSkill.type,
          proficiency: newSkill.type === 'HAVE' ? newSkill.proficiency : undefined,
          notes: newSkill.notes || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSkills(prev => [...prev, result.userSkill]);
        setNewSkill({ skillName: '', type: 'ASK', proficiency: undefined, notes: '' });
        setShowAddSkill(false);
        setMessage({ type: 'success', text: 'Skill added successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to add skill' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const removeUserSkill = async (skillId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/skills/${skillId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSkills(prev => prev.filter(s => s.id !== skillId));
        setMessage({ type: 'success', text: 'Skill removed successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to remove skill' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        credentials: 'include'
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setProfileForm({
          bio: profileData.bio || '',
          phone: profileData.phone || '',
          timezone: profileData.timezone || ''
        });
        setSkills(profileData.skills || []);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/account`, {
        credentials: 'include'
      });

      if (response.ok) {
        const accountData = await response.json();
        setAccountInfo(accountData);
        setAccountForm({ name: accountData.name || '' });
      }
    } catch (error) {
      console.error('Failed to fetch account info:', error);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setProfile(prev => prev ? { ...prev, ...data.user } : null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(passwordForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const updateAccount = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(accountForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Account updated successfully!' });
        setAccountInfo(prev => prev ? { ...prev, name: accountForm.name } : null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const uploadProfilePicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, we'll use a placeholder URL. In production, you'd upload to a service like AWS S3
    const imageUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(profile?.firstName?.[0] || 'U')}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile-picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ imageUrl })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile picture updated!' });
        setProfile(prev => prev ? { ...prev, profilePic: data.profilePic } : null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'profile' as const, label: 'Profile', icon: '👤' },
                { key: 'skills' as const, label: 'Skills & Resources', icon: '🎯' },
                { key: 'security' as const, label: 'Security', icon: '🔒' },
                ...(user?.role === 'ADMIN' ? [{ key: 'account' as const, label: 'Account', icon: '🏢' }] : [])
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>

                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                  <div className="shrink-0">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {profile?.profilePic ? (
                        <img src={profile.profilePic} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                      ) : (
                        `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadProfilePicture}
                        className="sr-only"
                      />
                      <span className="bg-white py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                        Change Picture
                      </span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">JPG, GIF or PNG. 1MB max.</p>
                  </div>
                </div>

                {/* Profile Info Display */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Name</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {profile?.firstName} {profile?.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm text-gray-900 mt-1">{profile?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Profile Form */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profileForm.timezone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select timezone...</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={updateProfile}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Change Password</h3>

                <div className="max-w-md space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={changePassword}
                    disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>

                {/* Logout Button */}
                <div className="border-t pt-6">
                  <button
                    onClick={logout}
                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Skills & Resources</h3>
                  <button
                    onClick={() => setShowAddSkill(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
                  >
                    Add Skill
                  </button>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <p>Manage what you <span className="font-medium text-green-600">offer</span> and what you <span className="font-medium text-blue-600">need</span> to connect with the right people in your network.</p>
                </div>

                {/* Skills Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* What I Offer (HAVE) */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-green-800 mb-3 flex items-center">
                      <span className="mr-2">🤝</span> What I Offer
                    </h4>
                    <div className="space-y-2">
                      {skills.filter(skill => skill.type === 'HAVE').length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No skills added yet</p>
                      ) : (
                        skills.filter(skill => skill.type === 'HAVE').map((skill) => (
                          <div key={skill.id} className="flex items-center justify-between bg-white border border-green-200 rounded-md p-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{skill.skill.name}</span>
                                {skill.proficiency && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    skill.proficiency === 'EXPERT' ? 'bg-purple-100 text-purple-700' :
                                    skill.proficiency === 'ADVANCED' ? 'bg-blue-100 text-blue-700' :
                                    skill.proficiency === 'INTERMEDIATE' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {skill.proficiency}
                                  </span>
                                )}
                              </div>
                              {skill.notes && (
                                <p className="text-sm text-gray-600 mt-1">{skill.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeUserSkill(skill.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove skill"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* What I Need (ASK) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                      <span className="mr-2">🎯</span> What I Need
                    </h4>
                    <div className="space-y-2">
                      {skills.filter(skill => skill.type === 'ASK').length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No needs added yet</p>
                      ) : (
                        skills.filter(skill => skill.type === 'ASK').map((skill) => (
                          <div key={skill.id} className="flex items-center justify-between bg-white border border-blue-200 rounded-md p-3">
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{skill.skill.name}</span>
                              {skill.notes && (
                                <p className="text-sm text-gray-600 mt-1">{skill.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeUserSkill(skill.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove need"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Skill Modal */}
                {showAddSkill && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900">Add Skill or Need</h4>
                        <button
                          onClick={() => setShowAddSkill(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type
                          </label>
                          <select
                            value={newSkill.type}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, type: e.target.value as 'ASK' | 'HAVE' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="ASK">🎯 What I Need</option>
                            <option value="HAVE">🤝 What I Offer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Skill Name
                          </label>
                          <input
                            type="text"
                            value={newSkill.skillName}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, skillName: e.target.value }))}
                            placeholder="e.g., React Development, Marketing Strategy..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {newSkill.type === 'HAVE' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Proficiency Level
                            </label>
                            <select
                              value={newSkill.proficiency || ''}
                              onChange={(e) => setNewSkill(prev => ({ 
                                ...prev, 
                                proficiency: e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | undefined 
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select level...</option>
                              <option value="BEGINNER">Beginner</option>
                              <option value="INTERMEDIATE">Intermediate</option>
                              <option value="ADVANCED">Advanced</option>
                              <option value="EXPERT">Expert</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={newSkill.notes}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional details or context..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            onClick={addUserSkill}
                            disabled={saving || !newSkill.skillName.trim()}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {saving ? 'Adding...' : 'Add Skill'}
                          </button>
                          <button
                            onClick={() => setShowAddSkill(false)}
                            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && user?.role === 'ADMIN' && accountInfo && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>

                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <button
                    onClick={updateAccount}
                    disabled={saving}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Account'}
                  </button>
                </div>

                {/* Account Stats */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="text-2xl">👥</div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                            <dd className="text-lg font-medium text-gray-900">{accountInfo.users.length}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="text-2xl">📇</div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
                            <dd className="text-lg font-medium text-gray-900">{accountInfo._count.contacts}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="text-2xl">📧</div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Campaigns</dt>
                            <dd className="text-lg font-medium text-gray-900">{accountInfo._count.campaigns}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Team Members</h4>
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {accountInfo.users.map((teamUser) => (
                        <li key={teamUser.id} className="px-4 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {teamUser.firstName[0]}{teamUser.lastName[0]}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {teamUser.firstName} {teamUser.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{teamUser.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                teamUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 
                                teamUser.role === 'MEMBER' ? 'bg-blue-100 text-blue-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {teamUser.role}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                teamUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {teamUser.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;