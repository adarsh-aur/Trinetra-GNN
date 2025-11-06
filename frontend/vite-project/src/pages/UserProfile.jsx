import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  Activity,
  Award,
  Shield,
  Clock,
  CheckCircle,
  Building2
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserProfile = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    location: '',
    joinDate: '',
    role: '',
    bio: '',
    avatar: null
  });

  // tempData can hold avatarFile for upload and avatar (preview URL)
  const [tempData, setTempData] = useState(profileData);

  useEffect(() => {
    if (user) {
      const joinDate = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';

      const updatedProfile = {
        name: user.fullName || user.name || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
        location: user.location || null,
        joinDate: joinDate,
        role: user.role || null,
        bio:
          user.bio ||
          `Working at ${user.company || 'your organization'}.`,
        avatar: user.avatar || null
      };

      setProfileData(updatedProfile);
      setTempData({ ...updatedProfile, avatarFile: null });
    }
  }, [user]);

  const handleEdit = () => {
    setTempData({ ...profileData, avatarFile: null });
    setIsEditing(true);
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = sessionStorage.getItem('token');

      // 1. Update profile fields
      const response = await axios.put(
        `${API_URL}/api/auth/profile`,
        {
          fullName: tempData.name,
          phone: tempData.phone,
          location: tempData.location,
          bio: tempData.bio,
          role: tempData.role
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // 2. If avatar file exists, upload it (separate endpoint)
      if (tempData.avatarFile) {
        // adjust endpoint if backend expects different path
        const form = new FormData();
        form.append('avatar', tempData.avatarFile);

        await axios.put(`${API_URL}/api/auth/profile/avatar`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      if (response.data.success !== false) {
        // merge profile update locally (avatar already previewed)
        const newProfile = { ...profileData, ...tempData };
        // Remove avatarFile before saving to profileData
        delete newProfile.avatarFile;
        setProfileData(newProfile);
        setIsEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempData({ ...profileData, avatarFile: null });
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  };

  const handleChange = (field, value) => {
    setTempData(prev => ({ ...prev, [field]: value }));
  };

  const onChooseAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // preview
    const previewUrl = URL.createObjectURL(file);
    setTempData(prev => ({ ...prev, avatar: previewUrl, avatarFile: file }));
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              border: '4px solid #a855f7',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}
          ></div>
          <div style={{ color: '#e9d5ff', fontSize: '20px', textShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              color: '#e9d5ff',
              fontSize: '20px',
              marginBottom: '16px',
              textShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
            }}
          >
            Please log in to view your profile
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.6)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              background: i % 2 === 0 ? '#a855f7' : '#7c3aed',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              opacity: Math.random() * 0.3 + 0.1,
              boxShadow: `0 0 ${Math.random() * 10 + 5}px ${i % 2 === 0 ? '#a855f7' : '#7c3aed'}`
            }}
          />
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Hidden file input for avatar */}
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Return to Dashboard Button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginBottom: '24px',
            background: 'rgba(15, 15, 15, 0.8)',
            color: '#e9d5ff',
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={(e) => {
            e.target.style.borderColor = 'rgba(168, 85, 247, 0.6)';
            e.target.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
            e.target.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.2)';
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Dashboard
        </button>

        {/* Success Message */}
        {success && (
          <div
            style={{
              marginBottom: '24px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(74, 222, 128, 0.5)',
              color: '#86efac',
              padding: '16px 24px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)'
            }}
          >
            <CheckCircle size={24} />
            <span style={{ fontWeight: '500' }}>Profile updated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: '24px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(248, 113, 113, 0.5)',
              color: '#fca5a5',
              padding: '16px 24px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 20px rgba(248, 113, 113, 0.2)'
            }}
          >
            <X size={24} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {/* Header Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '42px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #e9d5ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '8px',
                textShadow: '0 0 40px rgba(168, 85, 247, 0.3)'
              }}
            >
              User Profile
            </h1>
            <p style={{ color: '#c4b5fd' }}>Manage your personal information and account settings</p>
          </div>

          {!isEditing ? (
            <button
              onClick={handleEdit}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s',
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.6)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Edit2 size={18} />
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                  opacity: saving ? 0.5 : 1,
                  fontWeight: '500'
                }}
                onMouseOver={(e) => !saving && (e.target.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.6)')}
                onMouseOut={(e) => !saving && (e.target.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)')}
              >
                {saving ? (
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    ></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                style={{
                  background: 'rgba(15, 15, 15, 0.8)',
                  color: '#e9d5ff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s',
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)',
                  opacity: saving ? 0.5 : 1,
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => !saving && (e.target.style.borderColor = 'rgba(168, 85, 247, 0.6)')}
                onMouseOut={(e) => !saving && (e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)')}
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Main Profile Card */}
        <div
          style={{
            background: 'rgba(15, 15, 15, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.2)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            marginBottom: '32px'
          }}
        >
          {/* Cover Image */}
          <div
            style={{
              height: '192px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.2,
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }}
            ></div>
          </div>

          {/* Profile Content */}
          <div style={{ padding: '0 32px 32px' }}>
            {/* Avatar Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginTop: '-80px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    border: '4px solid #0a0a0a',
                    boxShadow: '0 0 40px rgba(168, 85, 247, 0.5)',
                    overflow: 'hidden'
                  }}
                >
                  {isEditing ? (tempData.avatar ? (
                    <img
                      src={tempData.avatar}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(tempData.name)
                  )) : profileData.avatar ? (
                    <img
                      src={profileData.avatar}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(profileData.name)
                  )}
                </div>
                {isEditing && (
                  <button
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                      borderRadius: '50%',
                      color: 'white',
                      border: '2px solid #0a0a0a',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
                    }}
                    onMouseOver={(e) => (e.target.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.7)')}
                    onMouseOut={(e) => (e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.5)')}
                    onClick={onChooseAvatar}
                    title="Change avatar"
                  >
                    <Camera size={20} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#c4b5fd',
                    fontSize: '14px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Calendar size={16} />
                  <span>Joined {profileData.joinDate}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#86efac',
                    fontSize: '14px',
                    background: 'rgba(74, 222, 128, 0.15)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Shield size={16} />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>

            {/* Name, Role & Bio */}
            <div style={{ marginBottom: '32px' }}>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={tempData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Your Full Name"
                    style={{
                      fontSize: '30px',
                      fontWeight: 'bold',
                      color: '#e9d5ff',
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      width: '100%',
                      marginBottom: '12px',
                      outline: 'none',
                      transition: 'all 0.3s',
                      backdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                      e.target.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <input
                    type="text"
                    value={tempData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    placeholder="Your Role/Title"
                    style={{
                      fontSize: '20px',
                      color: '#c4b5fd',
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      width: '100%',
                      marginBottom: '12px',
                      outline: 'none',
                      transition: 'all 0.3s',
                      backdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                      e.target.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#e9d5ff', marginBottom: '8px', textShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}>
                    {profileData.name || 'User'}
                  </h2>
                  <p style={{ fontSize: '20px', color: '#c4b5fd', marginBottom: '16px' }}>{profileData.role}</p>
                </>
              )}

              {isEditing ? (
                <textarea
                  value={tempData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  style={{
                    color: '#c4b5fd',
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    width: '100%',
                    height: '112px',
                    resize: 'none',
                    outline: 'none',
                    transition: 'all 0.3s',
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    backdropFilter: 'blur(10px)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                    e.target.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <p style={{ color: '#c4b5fd', lineHeight: '1.75', fontSize: '18px' }}>{profileData.bio}</p>
              )}
            </div>

            {/* Contact Information Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px'
              }}
            >
              {/* Email - Read Only */}
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '8px', transition: 'all 0.3s' }}>
                    <Mail size={20} style={{ color: '#c4b5fd' }} />
                  </div>
                  <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Email Address
                  </span>
                </div>
                <p style={{ color: '#e9d5ff', fontWeight: '500', fontSize: '18px' }}>{profileData.email || 'Not provided'}</p>
                <p style={{ color: '#7c3aed', fontSize: '12px', marginTop: '4px' }}>Email cannot be changed</p>
              </div>

              {/* Company - Read Only */}
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '8px', transition: 'all 0.3s' }}>
                    <Building2 size={20} style={{ color: '#c084fc' }} />
                  </div>
                  <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Company
                  </span>
                </div>
                <p style={{ color: '#e9d5ff', fontWeight: '500', fontSize: '18px' }}>{profileData.company || 'Not provided'}</p>
                <p style={{ color: '#7c3aed', fontSize: '12px', marginTop: '4px' }}>Company cannot be changed</p>
              </div>

              {/* Phone */}
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '8px', transition: 'all 0.3s' }}>
                    <Phone size={20} style={{ color: '#4ade80' }} />
                  </div>
                  <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Phone Number
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="tel"
                    value={tempData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    style={{
                      color: 'white',
                      background: 'rgba(31, 41, 55, 0.5)',
                      border: '1px solid #4b5563',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      width: '100%',
                      outline: 'none',
                      transition: 'border 0.3s',
                      fontSize: '16px'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                    onBlur={(e) => (e.target.style.borderColor = '#4b5563')}
                  />
                ) : (
                  <p style={{ color: 'white', fontWeight: '500', fontSize: '18px' }}>{profileData.phone || 'Not provided'}</p>
                )}
              </div>

              {/* Location */}
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '8px', transition: 'all 0.3s' }}>
                    <MapPin size={20} style={{ color: '#22d3ee' }} />
                  </div>
                  <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Location
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={tempData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="City, State, Country"
                    style={{
                      color: 'white',
                      background: 'rgba(31, 41, 55, 0.5)',
                      border: '1px solid #4b5563',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      width: '100%',
                      outline: 'none',
                      transition: 'border 0.3s',
                      fontSize: '16px'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#06b6d4')}
                    onBlur={(e) => (e.target.style.borderColor = '#4b5563')}
                  />
                ) : (
                  <p style={{ color: 'white', fontWeight: '500', fontSize: '18px' }}>{profileData.location}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes float {
            from { transform: translateY(0); }
            to { transform: translateY(-40px); }
          }
        `}
      </style>
    </div>
  );
};

export default UserProfile;
