import React, { useState, useEffect } from 'react';
import { 
  User, Phone, MapPin, Globe, Clock, 
  Save, LogOut, Loader, Camera, HardDrive,
  CheckCircle
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize } from '../../services/storageService';
import './ClientProfile.css';

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'it', label: 'Italiano' },
];

const TIMEZONES = [
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const ClientProfile = ({ currentUser }) => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    address: '',
    website: '',
    language: 'es',
    timezone: 'Europe/Madrid',
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFormData({
          displayName: data.displayName || currentUser.displayName || '',
          phone: data.phone || '',
          address: data.address || '',
          website: data.website || '',
          language: data.language || 'es',
          timezone: data.timezone || 'Europe/Madrid',
        });

        // Storage info
        const storageLimit = data.storageLimit || 1073741824;
        const storageUsed = data.storageUsed || 0;
        setStorageInfo({
          used: storageUsed,
          limit: storageLimit,
          percent: ((storageUsed / storageLimit) * 100).toFixed(1)
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      // Update Firebase Auth display name
      if (auth.currentUser && formData.displayName !== currentUser?.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName.trim()
        });
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: formData.displayName.trim(),
        phone: formData.phone,
        address: formData.address,
        website: formData.website,
        language: formData.language,
        timezone: formData.timezone,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Seguro que quieres cerrar sesión?')) return;
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getStorageColor = (percent) => {
    if (percent > 90) return '#ef4444';
    if (percent > 70) return '#f59e0b';
    return '#2563eb';
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <Loader className="spinner" size={32} />
        <p>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="client-profile">
      <div className="profile-header">
        <h1>
          <User size={24} />
          Mi Perfil
        </h1>
        <p>Gestiona tu información personal y preferencias</p>
      </div>

      <div className="profile-grid">
        {/* Left column — avatar + storage */}
        <div className="profile-sidebar">
          {/* Avatar */}
          <div className="profile-avatar-card">
            <div className="avatar-container">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={formData.displayName}
                  className="avatar-img"
                />
              ) : (
                <div className="avatar-placeholder">
                  {formData.displayName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="avatar-badge">
                <Camera size={14} />
              </div>
            </div>
            <h3 className="avatar-name">{formData.displayName || 'Sin nombre'}</h3>
            <p className="avatar-email">{currentUser?.email}</p>
            <span className="avatar-role">Cliente</span>
          </div>

          {/* Storage */}
          {storageInfo && (
            <div className="storage-card">
              <h4>
                <HardDrive size={16} />
                Almacenamiento
              </h4>
              <div className="storage-bar-container">
                <div className="storage-bar">
                  <div
                    className="storage-bar-fill"
                    style={{
                      width: `${Math.min(storageInfo.percent, 100)}%`,
                      background: getStorageColor(parseFloat(storageInfo.percent))
                    }}
                  />
                </div>
              </div>
              <div className="storage-labels">
                <span>{formatFileSize(storageInfo.used)} usado</span>
                <span>{formatFileSize(storageInfo.limit)} total</span>
              </div>
              <p className="storage-percent">{storageInfo.percent}% utilizado</p>
            </div>
          )}

          {/* Logout */}
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>

        {/* Right column — form */}
        <div className="profile-form-section">
          {/* Personal info */}
          <div className="form-card">
            <h3>
              <User size={18} />
              Información personal
            </h3>

            <div className="form-group">
              <label htmlFor="displayName">
                Nombre completo <span className="required">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={14} />
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+34 600 000 000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">
                <MapPin size={14} />
                Dirección
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Calle, ciudad, país"
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">
                <Globe size={14} />
                Sitio web
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://tu-web.com"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="form-card">
            <h3>
              <Clock size={18} />
              Preferencias
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="language">Idioma</label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="timezone">
                  <Clock size={14} />
                  Zona horaria
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Account info (read-only) */}
          <div className="form-card read-only-card">
            <h3>Información de cuenta</h3>
            <div className="account-info-row">
              <span className="account-label">Email</span>
              <span className="account-value">{currentUser?.email}</span>
            </div>
            <div className="account-info-row">
              <span className="account-label">Estado</span>
              <span className="account-value status-approved">✅ Aprobado</span>
            </div>
          </div>

          {/* Save button */}
          <div className="profile-actions">
            <button
              className={`btn-save ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader size={16} className="spinner" />
                  Guardando...
                </>
              ) : saved ? (
                <>
                  <CheckCircle size={16} />
                  ¡Guardado!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
