import React, { useState, useEffect } from 'react';
import { PublicService } from '../../services/publicService';
import type { PublicComplaintTrackingResult, EvidenceMediaItem } from '../../types/public';
import { EvidenceMediaViewer } from '../../components/EvidenceMediaViewer';
import { formatDate } from '../../utils';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface PublicComplaintTrackPageProps {
  initialCid?: string;
  onNavigate: (path: string) => void;
}

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER REVIEW', label: 'Under Review' },
  { key: 'ACTION IN PROGRESS', label: 'Investigation / Action' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

export function PublicComplaintTrackPage({ initialCid, onNavigate }: PublicComplaintTrackPageProps) {
  const [complaintId, setComplaintId] = useState(initialCid || '');
  const [verificationValue, setVerificationValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<PublicComplaintTrackingResult | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceMediaItem[]>([]);

  // Clarification form state
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);
  const [clarificationSuccess, setClarificationSuccess] = useState<string | null>(null);
  const [clarificationError, setClarificationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCid) {
      setComplaintId(initialCid);
    }
  }, [initialCid]);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setComplaint(null);
    setEvidenceList([]);
    setClarificationSuccess(null);
    setClarificationError(null);

    if (!complaintId.trim()) {
      setError('Please enter your Complaint ID.');
      return;
    }

    if (!verificationValue.trim()) {
      setError('Please enter your verification value (Mobile, Email, or Reference Token).');
      return;
    }

    try {
      setLoading(true);
      const [res, evList] = await Promise.all([
        PublicService.trackComplaint(complaintId.trim(), verificationValue.trim()),
        PublicService.getEvidence(complaintId.trim()).catch(() => []),
      ]);
      setComplaint(res);
      setEvidenceList(evList || []);
    } catch (err: any) {
      console.error('Tracking error:', err);
      setError(err.message || 'Unable to verify complaint. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    if (!clarificationText.trim() || clarificationText.trim().length < 10) {
      setClarificationError('Clarification response must be at least 10 characters.');
      return;
    }

    setClarificationSubmitting(true);
    setClarificationError(null);
    setClarificationSuccess(null);

    try {
      await PublicService.submitClarification(
        complaint.complaintId,
        verificationValue.trim(),
        clarificationText.trim()
      );
      setClarificationSuccess('Clarification response successfully recorded. Your case dossier has been re-submitted for district review.');
      setClarificationText('');
      // Refresh complaint status
      const updated = await PublicService.trackComplaint(complaint.complaintId, verificationValue.trim());
      setComplaint(updated);
    } catch (err: any) {
      setClarificationError(err.message || 'Failed to submit clarification. Please verify your connection.');
    } finally {
      setClarificationSubmitting(false);
    }
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const s = currentStatus.toUpperCase();
    if (s === 'CLOSED' || s === 'RESOLVED') {
      if (stepKey === s) return 'active';
      return 'completed';
    }
    if (s === 'ACTION IN PROGRESS' || s === 'INSPECTION_REQUESTED' || s === 'INFORMATION_REQUESTED' || s === 'VERIFICATION_REQUIRED' || s === 'ESCALATED') {
      if (stepKey === 'ACTION IN PROGRESS') return 'active';
      if (stepKey === 'SUBMITTED' || stepKey === 'UNDER REVIEW') return 'completed';
      return 'pending';
    }
    if (s === 'UNDER REVIEW' || s === 'CLARIFICATION_REQUIRED') {
      if (stepKey === 'UNDER REVIEW') return 'active';
      if (stepKey === 'SUBMITTED') return 'completed';
      return 'pending';
    }
    if (s === 'SUBMITTED') {
      if (stepKey === 'SUBMITTED') return 'active';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="border-b border-[#E9ECEF] pb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#005eb2]/10 text-[#005eb2] text-[10px] font-bold uppercase tracking-wider mb-2">
          <Search size={12} />
          <span>Civic Redressal Tracking</span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#000a1f]"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Track Complaint Status
        </h1>
        <p className="text-xs text-[#747780] mt-1 max-w-md mx-auto">
          Enter your unique Complaint ID along with your verification detail (Mobile, Email, or Token) to check the administrative review progress.
        </p>
      </div>

      {/* ── Tracking Input Card ──────────────────────────────── */}
      <div className="bg-white border border-[#E9ECEF] rounded-sm p-6 shadow-xs space-y-4">
        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f] block mb-1">
              Complaint ID <span className="text-[#DC3545]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. MPLADS-CMP-XXXXXX"
              value={complaintId}
              onChange={(e) => setComplaintId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-[#E9ECEF] rounded-sm focus:outline-none focus:border-[#005eb2] uppercase"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f]">
                Verification Value <span className="text-[#DC3545]">*</span>
              </label>
              <span className="text-[10px] text-[#747780]">Mobile, Email, or Reference Token</span>
            </div>
            <input
              type="text"
              placeholder="Enter the mobile number, email, or token used during submission"
              value={verificationValue}
              onChange={(e) => setVerificationValue(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E9ECEF] rounded-sm focus:outline-none focus:border-[#005eb2]"
              required
            />
            <p className="text-[10px] text-[#747780] mt-1 flex items-center gap-1">
              <Lock size={11} className="text-[#198754]" />
              <span>Privacy Guard: Verification protects citizen complaints from public enumeration or guessing.</span>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-sm bg-[#005eb2] hover:bg-[#004b8f] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying and Retrieving Status…</span>
              </>
            ) : (
              <>
                <Search size={14} />
                <span>Track Status</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Public Status Dossier Card ───────────────────────── */}
      {complaint && (
        <div className="bg-white border border-[#E9ECEF] rounded-sm p-6 sm:p-8 shadow-md space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9ECEF] pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#747780]">Verified Complaint Record</span>
              <h3 className="text-xl font-bold font-mono text-[#00204a]">
                {complaint.complaintId}
              </h3>
            </div>
            <span className={`self-start sm:self-center px-2.5 py-1 rounded-sm text-xs font-bold uppercase border ${
              complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : complaint.status === 'CLARIFICATION_REQUIRED'
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                : complaint.status === 'ESCALATED'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              Status: {complaint.status}
            </span>
          </div>

          {/* Workflow Stepper */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#747780] block">
              Grievance Workflow Progression
            </span>
            <div className="grid grid-cols-5 gap-1 pt-1">
              {STATUS_STEPS.map((step, idx) => {
                const stepState = getStepStatus(step.key, complaint.status);
                const isDone = stepState === 'completed';
                const isCurrent = stepState === 'active';

                return (
                  <div key={step.key} className="flex flex-col items-center text-center space-y-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-[#005eb2] text-white ring-2 ring-[#005eb2]/30'
                          : 'bg-[#f8f9fa] border border-[#E9ECEF] text-[#747780]'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                    </div>
                    <span
                      className={`text-[9px] font-semibold uppercase leading-tight ${
                        isCurrent
                          ? 'text-[#005eb2] font-bold'
                          : isDone
                          ? 'text-emerald-700'
                          : 'text-[#747780]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Public Safe Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-sm bg-[#f8f9fa] border border-[#E9ECEF] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#747780]">Referenced Project</span>
              <p className="font-mono text-[#005eb2] font-semibold">{complaint.workId}</p>
              <p className="text-[11px] text-[#44474f] truncate">{complaint.projectTitle}</p>
              {complaint.district && (
                <p className="text-[10px] text-[#747780]">
                  Location: {complaint.district}, {complaint.state}
                </p>
              )}
            </div>

            <div className="p-3 rounded-sm bg-[#f8f9fa] border border-[#E9ECEF] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#747780]">Category</span>
              <p className="font-semibold text-[#141d23]">{complaint.complaintCategory}</p>
              <p className="text-[11px] text-[#747780]">
                Submitted: {formatDate(complaint.submittedAt)}
              </p>
            </div>
          </div>

          {/* Citizen Clarification Callout & Form */}
          {complaint.status === 'CLARIFICATION_REQUIRED' && (
            <div className="p-5 rounded-sm bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Clarification Required From Complainant
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    The District Officer has requested additional details or supporting observations before progressing with administrative action. Please provide your clarification below:
                  </p>
                </div>
              </div>

              {clarificationSuccess && (
                <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>{clarificationSuccess}</span>
                </div>
              )}

              {clarificationError && (
                <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                  <span>{clarificationError}</span>
                </div>
              )}

              <form onSubmit={handleClarificationSubmit} className="space-y-3 pt-1">
                <div>
                  <textarea
                    rows={3}
                    placeholder="Enter specific clarification details, landmark specifics, or observations requested by the reviewing authority..."
                    value={clarificationText}
                    onChange={(e) => setClarificationText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-sm bg-white focus:outline-none focus:border-amber-600"
                    required
                  />
                  <span className="text-[10px] text-amber-700 block mt-1">
                    Minimum 10 characters. Your clarification will be officially recorded in the case timeline.
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={clarificationSubmitting || clarificationText.trim().length < 10}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {clarificationSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Clarification…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Submit Clarification Response</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Public Response / Action Taken Notice */}
          <div className="p-4 rounded-sm bg-[#f6faff] border border-[#005eb2]/20 space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204a]">
              Administrative Review Summary
            </h4>
            <p className="text-xs text-[#44474f] leading-relaxed">
              {complaint.publicResponse}
            </p>
            <div className="text-[10px] text-[#747780] pt-1 border-t border-[#005eb2]/10 flex items-center justify-between">
              <span>Last Status Update: {formatDate(complaint.updatedAt)}</span>
              <span>Reviewing Authority: District Administration</span>
            </div>
          </div>

          {/* Attached Evidence & Proof Dossier (Images, Videos, Audio, Documents) */}
          <div className="pt-2">
            <EvidenceMediaViewer
              items={evidenceList}
              title="Verified Evidence & Ground Proofs"
              emptyMessage="No media proof files attached to this complaint."
              allowDownload={true}
            />
          </div>

          {/* Public-Safe Case Timeline */}
          {complaint.timeline && complaint.timeline.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#00204a] flex items-center gap-1.5">
                <Clock size={14} className="text-[#005eb2]" />
                <span>Verified Case Timeline & Action Events</span>
              </h4>
              <div className="space-y-2 border-l-2 border-[#005eb2]/30 pl-4 ml-1">
                {complaint.timeline.map((ev, idx) => (
                  <div key={ev.id || idx} className="relative group pb-2">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#005eb2] border-2 border-white ring-1 ring-[#005eb2]/50" />
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <span className="text-[11px] font-bold text-[#00204a]">
                        {ev.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[#747780]">
                        {formatDate(ev.createdAt)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#005eb2] font-medium">
                      By: {ev.actorRole.replace(/_/g, ' ')} ({ev.actorName})
                    </div>
                    <p className="text-xs text-[#44474f] mt-0.5 bg-[#f8f9fa] p-2 rounded-xs border border-[#E9ECEF]">
                      {ev.remarks}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => onNavigate(`/projects/${complaint.workId}`)}
              className="text-xs font-semibold text-[#005eb2] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View Referenced Project Dossier</span>
              <ArrowRight size={13} />
            </button>

            <button
              onClick={() => {
                setComplaint(null);
                setVerificationValue('');
              }}
              className="text-xs text-[#747780] hover:text-[#141d23] cursor-pointer"
            >
              Track Another Complaint
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

