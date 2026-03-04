import React, { useState } from 'react';
import { User, Phone, MapPin, Globe, Clock, ChevronRight, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase';
import './OnboardingForm.css';

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

const OnboardingForm = ({ currentUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    phone: '',
    address: '',
    website: '',
    language: 'es',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (skip = false) => {
    if (!skip && !formData.displayName.trim()) {
      alert('Por favor, introduce tu nombre.');
      return;
    }

    setSaving(true);
    try {
      // Update Firebase Auth display name
      if (auth.currentUser && formData.displayName !== currentUser?.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName.trim()
        });
      }

      // Update Firestore user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName.trim() || currentUser?.displayName,
        phone: skip ? '' : formData.phone,
        address: skip ? '' : formData.address,
        website: skip ? '' : formData.website,
        language: formData.language,
        timezone: formData.timezone,
        onboardingComplete: true,
      });

      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar el perfil. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">ZDG</div>
          <h1>¡Bienvenido a Zeppelindg Manager!</h1>
          <p>Completa tu perfil para que podamos personalizar tu experiencia. Solo te llevará un momento.</p>
        </div>

        {/* Steps indicator */}
        <div className="onboarding-steps">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
          <div className="step-line" />
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`} />
        </div>

        {/* Step 1 — Basic info */}
        {step === 1 && (
          <div className="onboarding-step">
            <h2>
              <User size={20} />
              Información básica
            </h2>
            <p className="step-description">¿Cómo quieres que te llamemos?</p>

            <div className="form-group">
              <label htmlFor="displayName">
                Nombre <span className="required">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Tu nombre completo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={15} />
                Teléfono <span className="optional">(opcional)</span>
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
          </div>
        )}

        {/* Step 2 — Contact info */}
        {step === 2 && (
          <div className="onboarding-step">
            <h2>
              <MapPin size={20} />
              Datos de contacto
            </h2>
            <p className="step-description">Información adicional para tu perfil. Todo opcional.</p>

            <div className="form-group">
              <label htmlFor="address">
                <MapPin size={15} />
                Dirección <span className="optional">(opcional)</span>
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
                <Globe size={15} />
                Sitio web <span className="optional">(opcional)</span>
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
        )}

        {/* Step 3 — Preferences */}
        {step === 3 && (
          <div className="onboarding-step">
            <h2>
              <Clock size={20} />
              Preferencias
            </h2>
            <p className="step-description">Configura tu idioma y zona horaria.</p>

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
                <Clock size={15} />
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
        )}

        {/* Actions */}
        <div className="onboarding-actions">
          <button
            className="btn-skip"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <X size={16} />
            Completar después
          </button>

          <div className="onboarding-nav">
            {step > 1 && (
              <button
                className="btn-back"
                onClick={() => setStep(s => s - 1)}
                disabled={saving}
              >
                Atrás
              </button>
            )}

            {step < 3 ? (
              <button
                className="btn-next"
                onClick={() => {
                  if (step === 1 && !formData.displayName.trim()) {
                    alert('Por favor, introduce tu nombre.');
                    return;
                  }
                  setStep(s => s + 1);
                }}
                disabled={saving}
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="btn-finish"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? 'Guardando...' : '¡Listo! →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
