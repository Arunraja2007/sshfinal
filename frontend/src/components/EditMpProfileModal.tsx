import React, { useState, useRef } from 'react';
import {
  X, Camera, Image, Upload, Check, Landmark, User,
  Sparkles, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { INDIAN_POLITICAL_PARTIES, getPartyInfo, setMpParty, getMpParty } from '../services/mpPartyService';
import { updateMpPhotoInDb, setCachedMpPhoto } from '../services/mpPhotoService';
import { useAuthStore } from '../store/authStore';
import { MpAvatar } from './MpAvatar';

interface EditMpProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  mpProfile: {
    id: string;
    full_name: string;
    mp_name?: string | null;
    state?: string | null;
    constituency?: string | null;
    house?: string | null;
    photo_url?: string | null;
    party?: string | null;
    email?: string | null;
  };
  onSuccess?: (updated: {
    photo_url?: string;
    party?: string;
    full_name?: string;
    state?: string;
    constituency?: string;
  }) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
];

export function EditMpProfileModal({
  isOpen,
  onClose,
  mpProfile,
  onSuccess,
}: EditMpProfileModalProps) {
  const { profile, initAuth } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialParty = mpProfile.party || getMpParty(mpProfile.mp_name || mpProfile.id || mpProfile.full_name);
  const [selectedParty, setSelectedParty] = useState(initialParty);
  const [customParty, setCustomParty] = useState('');
  const [photoUrl, setPhotoUrl] = useState(mpProfile.photo_url || '');
  const [fullName, setFullName] = useState(mpProfile.full_name || '');
  const [constituency, setConstituency] = useState(mpProfile.constituency || '');
  const [state, setState] = useState(mpProfile.state || '');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPartyInfo = getPartyInfo(selectedParty === 'OTHER' ? customParty : selectedParty);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Photo file must be under 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalParty = selectedParty === 'OTHER' && customParty.trim() ? customParty.trim() : selectedParty;
      const mpKey = mpProfile.mp_name || mpProfile.id || mpProfile.full_name;

      // 1. Persist party
      setMpParty(mpKey, finalParty);
      if (mpProfile.id) setMpParty(mpProfile.id, finalParty);

      // 2. Persist photo in DB & Cache
      if (photoUrl) {
        await updateMpPhotoInDb(mpProfile.id, mpProfile.mp_name || mpProfile.full_name, photoUrl);
      }

      // 3. If current user is this MP, sync auth store
      if (profile && profile.id === mpProfile.id) {
        const updatedProfile = {
          ...profile,
          photo_url: photoUrl || profile.photo_url,
          full_name: fullName || profile.full_name,
          mp_name: fullName.replace(/^Hon'ble MP\s+/i, '') || profile.mp_name,
          party: finalParty,
          constituency: constituency || profile.constituency,
          state: state || profile.state,
        };
        useAuthStore.setState({ profile: updatedProfile as any });
      }

      setToastMessage('MP profile, party affiliation and photo updated successfully!');
      if (onSuccess) {
        onSuccess({
          photo_url: photoUrl,
          party: finalParty,
          full_name: fullName,
          state,
          constituency,
        });
      }

      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#00204a] via-[#09294f] to-[#041527] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Manage MP Profile &amp; Party</h3>
              <p className="text-xs text-slate-300">Update portrait image and official political party affiliation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: MP Photo & Avatar */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              MP Official Portrait / Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="relative group shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="MP Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/20"
                  />
                ) : (
                  <MpAvatar
                    name={fullName || mpProfile.full_name}
                    id={mpProfile.id}
                    size="xl"
                    className="ring-4 ring-slate-200"
                  />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-105"
                  title="Upload New Photo"
                >
                  <Camera size={13} />
                </button>
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Image URL or Web Link:
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/mp-photo.jpg"
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload size={13} className="text-emerald-600" />
                    <span>Upload from Device</span>
                  </button>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Clear Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Preset Avatars */}
            <div className="mt-3">
              <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                Or select from preset high-resolution portraits:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(presetUrl)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      photoUrl === presetUrl ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-105' : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Political Party Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Political Party Affiliation <span className="text-red-500">*</span>
              </label>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  color: currentPartyInfo.color,
                  backgroundColor: currentPartyInfo.bgColor,
                  borderColor: currentPartyInfo.borderColor,
                }}
              >
                {currentPartyInfo.shortName} &bull; {currentPartyInfo.name}
              </span>
            </div>

            <select
              value={selectedParty}
              onChange={e => setSelectedParty(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
            >
              {INDIAN_POLITICAL_PARTIES.map(p => (
                <option key={p.code} value={p.name}>
                  {p.name} ({p.shortName})
                </option>
              ))}
              <option value="OTHER">Other / Custom Political Party</option>
            </select>

            {selectedParty === 'OTHER' && (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Enter Custom Party Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revolutionary Socialist Party"
                  value={customParty}
                  onChange={e => setCustomParty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 3: Dignitary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Hon&apos;ble MP Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Parliamentary Constituency
              </label>
              <input
                type="text"
                value={constituency}
                onChange={e => setConstituency(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                placeholder="e.g. Varanasi, Wayanad..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving Updates…</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
