import React, { useEffect, useState } from 'react';
import { getCachedMpPhoto, getMpPhotosMap } from '../services/mpPhotoService';

interface MpAvatarProps {
  name?: string | null;
  id?: string | null;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showName?: boolean;
  className?: string;
  nameClassName?: string;
  subText?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl font-bold',
  '2xl': 'w-28 h-28 text-3xl font-bold',
};

function getInitials(name?: string | null): string {
  if (!name) return 'MP';
  const clean = name
    .replace(/^hon'ble\s+mp\s+/i, '')
    .replace(/^mp\s+/i, '')
    .replace(/shri|smt\.|smt|dr\.|dr|shrimati|km\.|adv\./gi, '')
    .trim();
  const parts = clean.split(/[\s,\.]+/).filter(Boolean);
  if (parts.length === 0) return 'MP';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MpAvatar({
  name,
  id,
  photoUrl: propPhotoUrl,
  size = 'sm',
  showName = false,
  className = '',
  nameClassName = '',
  subText,
}: MpAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    return propPhotoUrl || getCachedMpPhoto(id) || getCachedMpPhoto(name);
  });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (propPhotoUrl) {
      setPhotoUrl(propPhotoUrl);
      return;
    }
    const cached = getCachedMpPhoto(id) || getCachedMpPhoto(name);
    if (cached) {
      setPhotoUrl(cached);
    } else {
      getMpPhotosMap().then((map) => {
        const found = (id && map.get(id)) || (name && getCachedMpPhoto(name));
        if (found) setPhotoUrl(found);
      });
    }

    const handlePhotoUpdated = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.mpNameOrId === id || detail.mpNameOrId === name || detail.mpNameOrId?.toUpperCase() === name?.toUpperCase())) {
        setPhotoUrl(detail.photoUrl);
        setImgFailed(false);
      }
    };

    window.addEventListener('mp-photo-updated', handlePhotoUpdated);
    return () => window.removeEventListener('mp-photo-updated', handlePhotoUpdated);
  }, [name, id, propPhotoUrl]);

  const initials = getInitials(name);
  const sizeClass = sizeClasses[size] || sizeClasses.sm;

  const avatarElement = (
    <div className={`relative shrink-0 select-none ${className}`}>
      {photoUrl && !imgFailed ? (
        <img
          src={photoUrl}
          alt={name || 'MP Photo'}
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shadow-xs bg-slate-100 ring-1 ring-slate-900/5`}
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[#00204a] font-bold flex items-center justify-center border border-slate-300 shadow-xs ring-1 ring-slate-900/5`}
          title={name || 'Hon\'ble MP'}
        >
          {initials}
        </div>
      )}
    </div>
  );

  if (!showName) {
    return avatarElement;
  }

  return (
    <div className="inline-flex items-center gap-2.5">
      {avatarElement}
      <div className="flex flex-col">
        <span className={`font-semibold text-slate-900 leading-snug ${nameClassName}`}>
          {name || 'Hon\'ble MP'}
        </span>
        {subText && (
          <span className="text-[11px] text-slate-500 font-normal">
            {subText}
          </span>
        )}
      </div>
    </div>
  );
}
