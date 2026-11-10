import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Lock,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAuthenticatedAdminProfile,
  updateAuthenticatedAdminProfile,
  validateAvatarFile,
} from '../../services/adminProfileService';

/**
 * Oliveal Gaming Zone — Edit Admin Profile Page (/admin/settings/edit-profile).
 * Lets the authenticated admin update only their Full Name and Profile Picture (`avatar_url`)
 * while keeping Email Address strictly read-only with a lock indicator.
 */
export default function EditProfile() {
  const navigate = useNavigate();
  const { profile: authProfile, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(() => authProfile?.full_name || '');
  const [email, setEmail] = useState(() => authProfile?.email || '');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(() => authProfile?.avatar_url || '');
  const [previewObjectUrl, setPreviewObjectUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const liveProfile = await fetchAuthenticatedAdminProfile();
        if (!active) return;
        setFullName(liveProfile.full_name || '');
        setEmail(liveProfile.email || '');
        setCurrentAvatarUrl(liveProfile.avatar_url || '');
      } catch (err) {
        if (!active) return;
        if (err?.code === 'unauthenticated') {
          navigate('/login', { replace: true });
          return;
        }
        if (err?.code === 'forbidden') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setError(err?.message || 'Unable to load admin profile details.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      validateAvatarFile(file);
    } catch (err) {
      setError(err?.message || 'Invalid image selected.');
      e.target.value = '';
      return;
    }

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }
    const nextPreview = URL.createObjectURL(file);
    setPreviewObjectUrl(nextPreview);
    setSelectedFile(file);
    setAvatarFailed(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || loading) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Full Name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedProfile = await updateAuthenticatedAdminProfile({
        fullName: trimmedName,
        avatarFile: selectedFile,
      });

      await refreshProfile?.();

      navigate('/admin/settings', {
        replace: true,
        state: {
          refreshedProfile: updatedProfile,
          feedback: {
            type: 'success',
            text: 'Profile updated successfully.',
          },
        },
      });
    } catch (err) {
      if (err?.code === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      if (err?.code === 'forbidden') {
        navigate('/dashboard', { replace: true });
        return;
      }
      setError(err?.message || 'Unable to save profile updates right now.');
    } finally {
      setSaving(false);
    }
  };

  const displayedAvatar = previewObjectUrl || (!avatarFailed ? currentAvatarUrl : '');
  const initial = (fullName?.trim() || email || 'A').charAt(0).toUpperCase();

  return (
    <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-3.5 sm:pt-4 pb-28 space-y-4">
      {/* Header matching Edit Profile reference */}
      <header className="flex items-center gap-3 px-0.5">
        <button
          type="button"
          onClick={() => navigate('/admin/settings')}
          aria-label="Back to Settings"
          className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-purple-500/20 border border-white/10 flex items-center justify-center text-white transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
            Edit Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#A9A0BC] mt-0.5 font-medium leading-snug">
            Update your admin profile information
          </p>
        </div>
      </header>

      {/* Form Card matching Edit Profile reference */}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-4 sm:p-6 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(124,58,237,0.12)] backdrop-blur-md space-y-4"
      >
        {/* Profile Picture Uploader */}
        <div className="flex flex-col items-center gap-2.5 pt-1 pb-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || loading}
              aria-label="Change Profile Picture"
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#9333EA] to-[#6D28D9] border-2 border-purple-300/45 shadow-[0_0_24px_rgba(147,51,234,0.45)] flex items-center justify-center text-white text-3xl font-extrabold overflow-hidden cursor-pointer hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:opacity-60"
            >
              {displayedAvatar ? (
                <img
                  src={displayedAvatar}
                  alt={fullName || 'Admin avatar'}
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || loading}
              aria-label="Upload new profile photo"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1C1036] hover:bg-[#2A184E] border border-purple-300/60 shadow-lg flex items-center justify-center text-white transition cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-[#D8B4FE]" aria-hidden="true" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              aria-label="Choose profile picture file"
              className="hidden"
            />
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving || loading}
            className="text-xs font-medium text-[#D6CFE6] hover:text-white transition cursor-pointer"
          >
            Change Profile Picture
          </button>
        </div>

        {/* Full Name (Editable) */}
        <div className="space-y-1.5">
          <label
            htmlFor="edit-profile-full-name"
            className="block text-xs sm:text-sm font-bold text-white"
          >
            Full Name <span className="text-fuchsia-400">*</span>
          </label>
          <div className="relative">
            <User
              className="w-4 h-4 text-[#A9A0BC] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="edit-profile-full-name"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (error) setError(null);
              }}
              disabled={saving || loading}
              placeholder="Enter admin full name"
              className="w-full rounded-xl bg-[#19102C]/90 border border-purple-500/30 focus:border-[#C084FC] focus:ring-2 focus:ring-purple-500/25 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#7B7191] outline-none transition disabled:opacity-60"
            />
          </div>
        </div>

        {/* Email Address (Strictly Read-Only with Lock Icon) */}
        <div className="space-y-1.5">
          <label
            htmlFor="edit-profile-email"
            className="block text-xs sm:text-sm font-bold text-white"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail
              className="w-4 h-4 text-[#A9A0BC] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="edit-profile-email"
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              className="w-full rounded-xl bg-[#140D22]/90 border border-white/[0.12] pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#C4B5FD]/85 outline-none cursor-not-allowed select-all"
            />
            <Lock
              className="w-4 h-4 text-[#A9A0BC] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-[#A9A0BC] pt-0.5">
            <Info className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
            <span>Email address cannot be changed.</span>
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Action Buttons matching Edit Profile reference */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={saving || loading || !fullName.trim()}
            className="w-full py-3 px-5 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#A855F7] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-purple-300/35 shadow-[0_8px_28px_rgba(124,58,237,0.45)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Updating Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Update Profile</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            disabled={saving}
            className="w-full py-2.5 px-5 rounded-full bg-transparent hover:bg-white/[0.06] border border-purple-500/35 text-xs sm:text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

