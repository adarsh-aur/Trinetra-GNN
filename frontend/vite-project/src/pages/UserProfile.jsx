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

// Color Constants (matching Landing.jsx)
const BASE_BG_COLOR = 'rgba(0, 0, 10, 0.98)';
const BASE_BG_COLOR_HIGH_OPACITY = 'rgba(0, 0, 10, 0.95)';
const ACCENT_VIOLET = '#8A2BE2';
const TEXT_CYPHER = '#00FFFF';
const SHADOW_CYAN = '0 0 50px rgba(0, 255, 255, 0.9)';
const BORDER_CYPHER = '2px solid #00FFFF';
const TEXT_WHITE = '#E2E8F0';

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
        bio: user.bio || `Working at ${user.company || 'your organization'}.`,
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
        const newProfile = { ...profileData, ...tempData };
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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000005 0%, #150520 50%, #000005 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: `4px solid ${ACCENT_VIOLET}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
            boxShadow: `0 0 30px ${ACCENT_VIOLET}`
          }}></div>
          <div style={{ 
            color: TEXT_CYPHER, 
            fontSize: '20px', 
            textShadow: SHADOW_CYAN,
            fontWeight: '600'
          }}>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000005 0%, #150520 50%, #000005 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{
            color: TEXT_CYPHER,
            fontSize: '20px',
            marginBottom: '16px',
            textShadow: SHADOW_CYAN,
            fontWeight: '600'
          }}>
            Please log in to view your profile
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: ACCENT_VIOLET,
              color: TEXT_WHITE,
              padding: '12px 24px',
              borderRadius: '8px',
              border: `2px solid ${ACCENT_VIOLET}`,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: `0 0 20px ${ACCENT_VIOLET}`,
              fontWeight: '600',
              fontSize: '1rem'
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = `0 0 40px ${ACCENT_VIOLET}`;
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = `0 0 20px ${ACCENT_VIOLET}`;
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000005 0%, #150520 50%, #000005 100%)',
      padding: '32px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              background: i % 3 === 0 ? TEXT_CYPHER : ACCENT_VIOLET,
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 15 + 10}s linear infinite`,
              opacity: Math.random() * 0.4 + 0.1,
              boxShadow: `0 0 ${Math.random() * 15 + 5}px ${i % 3 === 0 ? TEXT_CYPHER : ACCENT_VIOLET}`
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
            background: BASE_BG_COLOR_HIGH_OPACITY,
            color: TEXT_CYPHER,
            padding: '12px 24px',
            borderRadius: '8px',
            border: BORDER_CYPHER,
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={(e) => {
            e.target.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Dashboard
        </button>

        {/* Success Message */}
        {success && (
          <div style={{
            marginBottom: '24px',
            background: 'rgba(0, 255, 0, 0.1)',
            border: '2px solid #00FF00',
            color: '#00FF00',
            padding: '16px 24px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <CheckCircle size={24} />
            <span style={{ fontWeight: '600' }}>Profile updated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '24px',
            background: 'rgba(255, 0, 100, 0.1)',
            border: '2px solid #FF0064',
            color: '#FF0064',
            padding: '16px 24px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(255, 0, 100, 0.3)'
          }}>
            <X size={24} />
            <span style={{ fontWeight: '600' }}>{error}</span>
          </div>
        )}

        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '42px',
              fontWeight: 'bold',
              color: ACCENT_VIOLET,
              marginBottom: '8px',
              textShadow: `0 0 40px ${ACCENT_VIOLET}`
            }}>
              User Profile
            </h1>
            <p style={{ color: TEXT_CYPHER, textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
              Manage your personal information and account settings
            </p>
          </div>

          {!isEditing ? (
            <button
              onClick={handleEdit}
              style={{
                background: ACCENT_VIOLET,
                color: TEXT_WHITE,
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${ACCENT_VIOLET}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s',
                boxShadow: `0 0 20px ${ACCENT_VIOLET}`,
                fontWeight: '600'
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = `0 0 40px ${ACCENT_VIOLET}`;
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = `0 0 20px ${ACCENT_VIOLET}`;
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
                  background: '#00FF00',
                  color: '#000000',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #00FF00',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s',
                  boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
                  opacity: saving ? 0.5 : 1,
                  fontWeight: '600'
                }}
                onMouseOver={(e) => !saving && (e.target.style.boxShadow = '0 0 40px rgba(0, 255, 0, 0.8)')}
                onMouseOut={(e) => !saving && (e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)')}
              >
                {saving ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #000000',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
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
                  background: BASE_BG_COLOR_HIGH_OPACITY,
                  color: TEXT_CYPHER,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: BORDER_CYPHER,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s',
                  boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
                  opacity: saving ? 0.5 : 1,
                  fontWeight: '600',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => !saving && (e.target.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)')}
                onMouseOut={(e) => !saving && (e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)')}
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Main Profile Card */}
        <div style={{
          background: BASE_BG_COLOR_HIGH_OPACITY,
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: `0 0 40px ${ACCENT_VIOLET}`,
          border: `2px solid ${ACCENT_VIOLET}`,
          marginBottom: '32px'
        }}>
          {/* Cover Image */}
          <div style={{
            height: '192px',
            background: `linear-gradient(135deg, ${ACCENT_VIOLET} 0%, ${TEXT_CYPHER} 100%)`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.2,
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          {/* Profile Content */}
          <div style={{ padding: '0 32px 32px' }}>
            {/* Avatar Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '-80px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${ACCENT_VIOLET} 0%, ${TEXT_CYPHER} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  border: '4px solid #000005',
                  boxShadow: `0 0 40px ${ACCENT_VIOLET}`,
                  overflow: 'hidden'
                }}>
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
                      background: TEXT_CYPHER,
                      borderRadius: '50%',
                      color: '#000000',
                      border: '2px solid #000005',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: `0 0 20px ${TEXT_CYPHER}`
                    }}
                    onMouseOver={(e) => (e.target.style.boxShadow = `0 0 40px ${TEXT_CYPHER}`)}
                    onMouseOut={(e) => (e.target.style.boxShadow = `0 0 20px ${TEXT_CYPHER}`)}
                    onClick={onChooseAvatar}
                    title="Change avatar"
                  >
                    <Camera size={20} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: TEXT_CYPHER,
                  fontSize: '14px',
                  background: 'rgba(0, 255, 255, 0.1)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: BORDER_CYPHER,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
                }}>
                  <Calendar size={16} />
                  <span>Joined {profileData.joinDate}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#00FF00',
                  fontSize: '14px',
                  background: 'rgba(0, 255, 0, 0.1)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '2px solid #00FF00',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
                }}>
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
                      color: TEXT_CYPHER,
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: BORDER_CYPHER,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      width: '100%',
                      marginBottom: '12px',
                      outline: 'none',
                      transition: 'all 0.3s',
                      backdropFilter: 'blur(10px)',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
                    }}
                    onBlur={(e) => {
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
                      color: TEXT_WHITE,
                      background: `rgba(138, 43, 226, 0.1)`,
                      border: `2px solid ${ACCENT_VIOLET}`,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      width: '100%',
                      marginBottom: '12px',
                      outline: 'none',
                      transition: 'all 0.3s',
                      backdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 20px ${ACCENT_VIOLET}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </>
              ) : (
                <>
                  <h2 style={{ 
                    fontSize: '36px', 
                    fontWeight: 'bold', 
                    color: TEXT_CYPHER, 
                    marginBottom: '8px', 
                    textShadow: SHADOW_CYAN 
                  }}>
                    {profileData.name || 'User'}
                  </h2>
                  <p style={{ fontSize: '20px', color: ACCENT_VIOLET, marginBottom: '16px', textShadow: `0 0 10px ${ACCENT_VIOLET}` }}>
                    {profileData.role}
                  </p>
                </>
              )}

              {isEditing ? (
                <textarea
                  value={tempData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  style={{
                    color: TEXT_WHITE,
                    background: BASE_BG_COLOR_HIGH_OPACITY,
                    border: `2px solid ${ACCENT_VIOLET}`,
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
                    e.target.style.boxShadow = `0 0 20px ${ACCENT_VIOLET}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <p style={{ color: TEXT_WHITE, lineHeight: '1.75', fontSize: '18px' }}>{profileData.bio}</p>
              )}
            </div>

            {/* Contact Information Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* Email - Read Only */}
              <div style={{
                background: BASE_BG_COLOR_HIGH_OPACITY,
                borderRadius: '12px',
                padding: '20px',
                border: BORDER_CYPHER,
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(0, 255, 255, 0.2)', borderRadius: '8px' }}>
                    <Mail size={20} style={{ color: TEXT_CYPHER }} />
                  </div>
                  <span style={{ color: TEXT_CYPHER, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Email Address
                  </span>
                </div>
                <p style={{ color: TEXT_WHITE, fontWeight: '500', fontSize: '18px' }}>{profileData.email || 'Not provided'}</p>
                <p style={{ color: ACCENT_VIOLET, fontSize: '12px', marginTop: '4px' }}>Email cannot be changed</p>
              </div>

              {/* Company - Read Only */}
              <div style={{
                background: BASE_BG_COLOR_HIGH_OPACITY,
                borderRadius: '12px',
                padding: '20px',
                border: `2px solid ${ACCENT_VIOLET}`,
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = `0 0 30px ${ACCENT_VIOLET}`;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: `rgba(138, 43, 226, 0.2)`, borderRadius: '8px' }}>
                    <Building2 size={20} style={{ color: ACCENT_VIOLET }} />
                  </div>
                  <span style={{ color: TEXT_CYPHER, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Company
                  </span>
                </div>
                <p style={{ color: TEXT_WHITE, fontWeight: '500', fontSize: '18px' }}>{profileData.company || 'Not provided'}</p>
                <p style={{ color: ACCENT_VIOLET, fontSize: '12px', marginTop: '4px' }}>Company cannot be changed</p>
              </div>

              {/* Phone */}
              <div style={{
                background: BASE_BG_COLOR_HIGH_OPACITY,
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid #00FF00',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(0, 255, 0, 0.2)', borderRadius: '8px' }}>
                    <Phone size={20} style={{ color: '#00FF00' }} />
                  </div>
                  <span style={{ color: TEXT_CYPHER, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      color: TEXT_WHITE,
                      background: 'rgba(0, 255, 0, 0.1)',
                      border: '2px solid #00FF00',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      width: '100%',
                      outline: 'none',
                      transition: 'all 0.3s',
                      fontSize: '16px',
                      backdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)')}
                    onBlur={(e) => (e.target.style.boxShadow = 'none')}
                  />
                ) : (
                  <p style={{ color: TEXT_WHITE, fontWeight: '500', fontSize: '18px' }}>{profileData.phone || 'Not provided'}</p>
                )}
              </div>

              {/* Location */}
              <div style={{
                background: BASE_BG_COLOR_HIGH_OPACITY,
                borderRadius: '12px',
                padding: '20px',
                border: BORDER_CYPHER,
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(0, 255, 255, 0.2)', borderRadius: '8px' }}>
                    <MapPin size={20} style={{ color: TEXT_CYPHER }} />
                  </div>
                  <span style={{ color: TEXT_CYPHER, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      color: TEXT_WHITE,
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: BORDER_CYPHER,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      width: '100%',
                      outline: 'none',
                      transition: 'all 0.3s',
                      fontSize: '16px',
                      backdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)')}
                    onBlur={(e) => (e.target.style.boxShadow = 'none')}
                  />
                ) : (
                  <p style={{ color: TEXT_WHITE, fontWeight: '500', fontSize: '18px' }}>{profileData.location}</p>
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
            0%, 100% { 
              transform: translateY(0) translateX(0);
              opacity: 0.3;
            }
            50% { 
              transform: translateY(-30px) translateX(10px);
              opacity: 0.6;
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </div>
  );
};

export default UserProfile;