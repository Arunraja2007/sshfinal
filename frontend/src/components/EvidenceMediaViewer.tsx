import React, { useState } from 'react';
import {
  FileText, Image as ImageIcon, Video, Music, Archive,
  Download, Eye, Maximize2, ExternalLink, ShieldCheck,
  User, Clock, ZoomIn, ZoomOut, RotateCw, X, Play
} from 'lucide-react';

export interface EvidenceMediaItem {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  storagePath: string; // Base64 dataUrl or public HTTP URL
  description?: string;
  uploadedBy?: string;
  uploaderRole?: string;
  createdAt?: string;
}

interface EvidenceMediaViewerProps {
  items: EvidenceMediaItem[];
  title?: string;
  emptyMessage?: string;
  allowDownload?: boolean;
}

export function EvidenceMediaViewer({
  items,
  title = 'Proof & Evidence Media Dossier',
  emptyMessage = 'No media proof or evidence documents attached yet.',
  allowDownload = true,
}: EvidenceMediaViewerProps) {
  const [selectedMedia, setSelectedMedia] = useState<EvidenceMediaItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!items || items.length === 0) {
    return (
      <div className="p-5 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
        <FileText size={28} className="mx-auto mb-2 text-slate-400 opacity-60" />
        <p className="font-medium">{emptyMessage}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Citizens and administrative roles can attach images, videos, audio recordings, or documents.</p>
      </div>
    );
  }

  const getMediaCategory = (type: string, name: string): 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'archive' => {
    const t = (type || '').toLowerCase();
    const ext = (name || '').split('.').pop()?.toLowerCase() || '';

    if (t.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext)) {
      return 'image';
    }
    if (t.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', '3gp'].includes(ext)) {
      return 'video';
    }
    if (t.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
      return 'audio';
    }
    if (t === 'application/pdf' || ext === 'pdf') {
      return 'pdf';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return 'archive';
    }
    return 'document';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return 'File';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getRoleBadgeColor = (role?: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('CITIZEN')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (r.includes('AGENCY')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (r.includes('AUDITOR')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (r.includes('DISTRICT')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (r.includes('STATE')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (r.includes('MOSPI') || r.includes('ADMIN')) return 'bg-rose-100 text-rose-800 border-rose-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const openLightbox = (item: EvidenceMediaItem) => {
    setSelectedMedia(item);
    setZoomLevel(1);
    setRotation(0);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#005eb2]" />
            <span>{title}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 font-bold">
              {items.length}
            </span>
          </h4>
          <span className="text-[10px] text-slate-400">
            Multi-format media evidence verifiable across all administrative roles
          </span>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, idx) => {
          const category = getMediaCategory(item.fileType, item.fileName);
          const isImage = category === 'image';
          const isVideo = category === 'video';
          const isAudio = category === 'audio';
          const isPdf = category === 'pdf';

          return (
            <div
              key={item.id || idx}
              className="group bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
            >
              {/* Media Thumbnail / Preview Header */}
              <div
                onClick={() => openLightbox(item)}
                className="relative bg-slate-900/5 aspect-video w-full flex items-center justify-center overflow-hidden cursor-pointer border-b border-slate-100"
              >
                {isImage ? (
                  <img
                    src={item.storagePath}
                    alt={item.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : isVideo ? (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-white relative">
                    <Video size={36} className="text-blue-400 opacity-80" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play size={18} className="translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                ) : isAudio ? (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-950 flex flex-col items-center justify-center text-white p-3">
                    <Music size={32} className="text-purple-300 mb-1" />
                    <span className="text-[10px] font-mono text-purple-200">Audio Recording</span>
                  </div>
                ) : isPdf ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-50 to-rose-100 flex flex-col items-center justify-center text-red-700 p-3">
                    <FileText size={36} className="text-red-600 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">PDF Document</span>
                  </div>
                ) : category === 'archive' ? (
                  <div className="w-full h-full bg-gradient-to-br from-amber-50 to-yellow-100 flex flex-col items-center justify-center text-amber-700 p-3">
                    <Archive size={36} className="text-amber-600 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Archive Package</span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-700 p-3">
                    <FileText size={36} className="text-slate-500 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Official Document</span>
                  </div>
                )}

                {/* Hover overlay button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-white text-slate-900 text-[11px] font-bold flex items-center gap-1 shadow-md">
                    <Eye size={12} />
                    <span>Inspect</span>
                  </span>
                </div>

                {/* Format Tag Badge */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                  {category}
                </div>
              </div>

              {/* Media Information Body */}
              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate" title={item.fileName}>
                    {item.fileName}
                  </p>
                  {item.description && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5" title={item.description}>
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Metadata & Actions */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-500">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getRoleBadgeColor(
                        item.uploaderRole || item.uploadedBy
                      )}`}
                    >
                      {item.uploaderRole || item.uploadedBy || 'Citizen'}
                    </span>
                    <span className="font-mono text-slate-400">{formatFileSize(item.fileSize)}</span>
                  </div>

                  {item.createdAt && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={10} />
                      <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => openLightbox(item)}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} />
                      <span>View Proof</span>
                    </button>

                    {allowDownload && item.storagePath && (
                      <a
                        href={item.storagePath}
                        download={item.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={11} />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Interactive Full-Screen Lightbox Modal ── */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                  {getMediaCategory(selectedMedia.fileType, selectedMedia.fileName)}
                </span>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-bold truncate text-white" title={selectedMedia.fileName}>
                    {selectedMedia.fileName}
                  </h3>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Uploaded by: {selectedMedia.uploadedBy || 'Citizen'} • {formatFileSize(selectedMedia.fileSize)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                {getMediaCategory(selectedMedia.fileType, selectedMedia.fileName) === 'image' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw size={14} />
                    </button>
                  </>
                )}

                {allowDownload && selectedMedia.storagePath && (
                  <a
                    href={selectedMedia.storagePath}
                    download={selectedMedia.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                    title="Download File"
                  >
                    <Download size={14} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={closeLightbox}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors ml-1"
                  title="Close Modal"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body / Media Canvas */}
            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[300px] max-h-[65vh]">
              {getMediaCategory(selectedMedia.fileType, selectedMedia.fileName) === 'image' ? (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
                  <img
                    src={selectedMedia.storagePath}
                    alt={selectedMedia.fileName}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-h-[58vh] max-w-full object-contain rounded shadow-lg select-none"
                  />
                </div>
              ) : getMediaCategory(selectedMedia.fileType, selectedMedia.fileName) === 'video' ? (
                <div className="w-full max-w-2xl">
                  <video
                    src={selectedMedia.storagePath}
                    controls
                    autoPlay
                    className="w-full max-h-[58vh] rounded-lg shadow-xl bg-black"
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
              ) : getMediaCategory(selectedMedia.fileType, selectedMedia.fileName) === 'audio' ? (
                <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 max-w-md w-full text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Music size={32} />
                  </div>
                  <p className="text-sm font-bold text-white truncate">{selectedMedia.fileName}</p>
                  <audio src={selectedMedia.storagePath} controls autoPlay className="w-full">
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : getMediaCategory(selectedMedia.fileType, selectedMedia.fileName) === 'pdf' ? (
                <div className="w-full h-[58vh] bg-white rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <iframe
                    src={selectedMedia.storagePath}
                    title={selectedMedia.fileName}
                    className="w-full h-full rounded border-0"
                  />
                </div>
              ) : (
                <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 max-w-md w-full text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                    <FileText size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedMedia.fileName}</p>
                    <p className="text-xs text-slate-400 mt-1">{selectedMedia.description || 'Official attached evidence file'}</p>
                  </div>
                  {selectedMedia.storagePath && (
                    <a
                      href={selectedMedia.storagePath}
                      download={selectedMedia.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md"
                    >
                      <Download size={14} />
                      <span>Download File ({formatFileSize(selectedMedia.fileSize)})</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer / Description & Provenance */}
            {selectedMedia.description && (
              <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300">
                <p className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Evidence Description / Field Remarks</p>
                <p className="text-slate-200">{selectedMedia.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
