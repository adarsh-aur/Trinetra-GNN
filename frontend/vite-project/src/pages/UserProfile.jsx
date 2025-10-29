import React, { useState, useContext } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save, X, Camera, Shield, Activity, Award } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import '../styles/dashboard.css';
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.fullName || 'John Doe',
    email: user?.email || 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'Madhyamgram, West Bengal, IN',
    joinDate: 'January 2024',
    bio: 'Cybersecurity analyst passionate about threat detection and network security. Experienced in implementing GNN-based security solutions.',
    avatar: null
  });

  const [tempData, setTempData] = useState(profileData);

  const handleEdit = () => {
    setTempData(profileData);
    setIsEditing(true);
  };

  const handleSave = () => {
    setProfileData(tempData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempData(profileData);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setTempData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="dashboard-page relative">

      {/* ✅ Return to Dashboard Button */}
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "14px",
          background: "#ef4444",
          color: "white",
          transition: "all 0.2s",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
          zIndex: 50,
        }}
        onMouseEnter={(e) => (e.target.style.background = "#dc2626")}
        onMouseLeave={(e) => (e.target.style.background = "#ef4444")}
      >
        Return to Dashboard
      </button>

      {/* Hero Section */}
      <div className="hero-section" style={{ minHeight: '300px' }}>
        <div className="hero-bg-elements">
          <div className="hero-grid"></div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="floating-icon">
              {['👤', '🔒', '🌐', '⚡', '🔍', '📊', '🛡️', '💼'][i]}
            </div>
          ))}
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`floating-shape ${['shape-circle', 'shape-square', 'shape-triangle', 'shape-circle'][i]}`}></div>
          ))}
        </div>

        <div className="hero-content">
          <h1>User Profile</h1>
          <p>Manage your personal information and account settings</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="dashboard-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Profile Settings</h2>
            <p className="text-gray-400">View and edit your personal information</p>
          </div>

          <div className="mt-4 md:mt-0">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center gap-2 transition-all"
              >
                <Edit2 size={18} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md flex items-center gap-2 transition-all"
                >
                  <Save size={18} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md flex items-center gap-2 transition-all"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl glow-card mb-8">
          {/* Cover Image */}
          <div className="h-40 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 relative">
            <div className="absolute inset-0 opacity-30">
              <div className="hero-grid"></div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Avatar Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-16 mb-6">
              <div className="relative mb-4 md:mb-0">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-gray-800 shadow-xl">
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-all">
                    <Camera size={18} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar size={16} />
                <span>Member since {profileData.joinDate}</span>
              </div>
            </div>

            {/* Name + Bio */}
            <div className="mb-6">
              {isEditing ? (
                <input
                  type="text"
                  value={tempData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="text-3xl font-bold text-white bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 w-full mb-3"
                />
              ) : (
                <h2 className="text-3xl font-bold text-white mb-3">{profileData.name}</h2>
              )}
              
              {isEditing ? (
                <textarea
                  value={tempData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  className="text-gray-300 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 w-full h-24 resize-none"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-gray-300 leading-relaxed">{profileData.bio}</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Mail size={20} className="text-blue-400" />
                  <span className="text-gray-400 text-sm font-medium">Email Address</span>
                </div>
                {isEditing ? (
                  <input
                    type="email"
                    value={tempData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="text-white bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full"
                  />
                ) : (
                  <p className="text-white font-medium">{profileData.email}</p>
                )}
              </div>

              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Phone size={20} className="text-blue-400" />
                  <span className="text-gray-400 text-sm font-medium">Phone Number</span>
                </div>
                {isEditing ? (
                  <input
                    type="tel"
                    value={tempData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="text-white bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full"
                  />
                ) : (
                  <p className="text-white font-medium">{profileData.phone}</p>
                )}
              </div>

              <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-all md:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin size={20} className="text-blue-400" />
                  <span className="text-gray-400 text-sm font-medium">Location</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={tempData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="text-white bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full"
                  />
                ) : (
                  <p className="text-white font-medium">{profileData.location}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <h3 className="text-gray-400 text-sm mb-1">Threats Detected</h3>
            <p className="text-3xl font-bold text-white">247</p>
            <div className="mt-3 text-blue-400 text-sm">↑ 12% this month</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <h3 className="text-gray-400 text-sm mb-1">Active Sessions</h3>
            <p className="text-3xl font-bold text-white">1,429</p>
            <div className="mt-3 text-cyan-400 text-sm">↑ 8% this month</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 glow-card">
            <h3 className="text-gray-400 text-sm mb-1">Achievements</h3>
            <p className="text-3xl font-bold text-white">48</p>
            <div className="mt-3 text-purple-400 text-sm">5 new badges</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 glow-card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { action: 'Analyzed network traffic', time: '2 hours ago', icon: '🔍' },
              { action: 'Detected SQL injection attempt', time: '5 hours ago', icon: '🚨' },
              { action: 'Updated security policies', time: '1 day ago', icon: '📋' },
              { action: 'Reviewed threat intelligence reports', time: '2 days ago', icon: '📊' },
              { action: 'Completed security training module', time: '3 days ago', icon: '🎓' }
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all border border-gray-600">
                <span className="text-2xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-gray-400 text-sm">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default UserProfile;
