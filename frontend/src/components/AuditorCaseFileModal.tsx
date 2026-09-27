import React, { useState, useEffect } from 'react';
import {
  X, Scale, ShieldAlert, CheckCircle2, Clock, AlertTriangle,
  FileText, ExternalLink, Send, ArrowRight, ShieldCheck,
  Calendar, DollarSign, Building2, MapPin, User, ChevronRight,
  Info, History, Check, FileCheck, Layers, HelpCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';
import { RiskBadge, RiskScoreRing } from './RiskBadge';
import { EvidenceMediaViewer, EvidenceMediaItem } from './EvidenceMediaViewer';
import { PublicService } from '../services/publicService';
import { getProjectExecutionEvidence } from '../services/projectService';
import {
  getAuditorCaseFile,
  updateAuditorStatus,
  requestAuditorInspection,
  addAuditorReviewNote,
  CaseFileDetail
} from '../services/auditorService';
import type { VerificationStatus } from '../types';
import { useAppStore } from '../store/store';

interface Props {
  workId: string;
  house: 'Lok Sabha' | 'Rajya Sabha';
  onClose: () => void;
  onStatusUpdated?: (newStatus: VerificationStatus) => void;
}

export function AuditorCaseFileModal({ workId, house, onClose, onStatusUpdated }: Props) {
  const { selectProject, setCurrentPage } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseFile, setCaseFile] = useState<CaseFileDetail | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceMediaItem[]>([]);

  // Inspection Request Modal sub-state
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionReason, setInspectionReason] = useState('Expenditure & Physical Progress Verification');
  const [inspectionPriority, setInspectionPriority] = useState<'High' | 'Medium' | 'Critical'>('High');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Review Note input
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status Action Confirmation Modal
  const [confirmStatusModal, setConfirmStatusModal] = useState<VerificationStatus | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [detail, pubEvidence, execEvidence] = await Promise.all([
          getAuditorCaseFile(workId, house),
          PublicService.getEvidence(workId).catch(() => []),
          getProjectExecutionEvidence(workId, house).catch(() => ({ evidence: [], updates: [] })),
        ]);
        if (mounted) {
          setCaseFile(detail);

          // Merge all evidence items
          const items: EvidenceMediaItem[] = [];
          if (Array.isArray(pubEvidence)) {
            items.push(...pubEvidence.map((e: any) => ({
              id: e.id,
              fileName: e.fileName || e.file_name || 'Evidence File',
              fileType: e.fileType || e.file_type || 'application/octet-stream',
              fileSize: e.fileSize || e.file_size || 0,
              storagePath: e.storagePath || e.storage_path || '',
              description: e.description || '',
              uploadedBy: e.uploadedBy || e.uploaded_by || 'Citizen / District',
              uploaderRole: e.uploaderRole || 'Citizen',
              createdAt: e.createdAt || e.created_at,
            })));
          }
          if (execEvidence && Array.isArray(execEvidence.evidence)) {
            for (const ev of execEvidence.evidence) {
              if (!items.some(x => x.fileName === ev.file_name)) {
                items.push({
                  id: ev.id,
                  fileName: ev.file_name || 'Agency Proof Document',
                  fileType: ev.file_type || 'image/jpeg',
                  fileSize: ev.file_size || 0,
                  storagePath: ev.storage_path || '',
                  description: ev.description || '',
                  uploadedBy: ev.uploaded_by || ev.agency_name || 'Implementing Agency',
                  uploaderRole: 'Implementing Agency',
                  createdAt: ev.created_at,
                });
              }
            }
          }
          setEvidenceList(items);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Unable to load case details.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [workId, house]);

  const p = caseFile?.project;
  const currentStatus: VerificationStatus = p?.verification_status || 'New Alert';

  const handleApplyStatus = async (status: VerificationStatus, comment?: string) => {
    setSubmittingStatus(true);
    try {
      await updateAuditorStatus(workId, house, status, comment || decisionComment);
      if (caseFile) {
        setCaseFile({
          ...caseFile,
          project: { ...caseFile.project, verification_status: status },
          timelineEvents: [
            ...caseFile.timelineEvents,
            {
              title: `Status Transition: ${status}`,
              timestamp: new Date().toISOString(),
              type: 'VERIFICATION_ACTION',
              description: comment || decisionComment || `Verification status transitioned to ${status}`,
              actor: 'Auditor / Verification Officer',
            },
          ],
        });
      }
      if (onStatusUpdated) onStatusUpdated(status);
      setActionSuccessMessage(`Successfully updated verification status to ${status}`);
      setConfirmStatusModal(null);
      setDecisionComment('');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionReason.trim()) return;
    setSubmittingInspection(true);
    try {
      await requestAuditorInspection(workId, house, {
        reason: inspectionReason,
        priority: inspectionPriority,
        notes: inspectionNotes,
      });
      if (caseFile) {
        setCaseFile({
          ...caseFile,
          project: { ...caseFile.project, verification_status: 'Inspection Requested' },
          timelineEvents: [
            ...caseFile.timelineEvents,
            {
              title: `Inspection Ordered [${inspectionPriority}]`,
              timestamp: new Date().toISOString(),
              type: 'VERIFICATION_ACTION',
              description: `${inspectionReason}: ${inspectionNotes}`,
              actor: 'Auditor / Verification Officer',
            },
          ],
        });
      }
      if (onStatusUpdated) onStatusUpdated('Inspection Requested');
      setShowInspectionModal(false);
      setInspectionNotes('');
      setActionSuccessMessage('Inspection request officially logged and dispatched to field authorities.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Inspection request failed: ${err.message}`);
    } finally {
      setSubmittingInspection(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await addAuditorReviewNote(workId, house, newNote.trim());
      if (caseFile) {
        setCaseFile({
          ...caseFile,
          verificationHistory: [
            {
              timestamp: new Date().toISOString(),
              action: 'Audit Review Note',
              comment: newNote.trim(),
              actor: 'Auditor / Verification Officer',
            },
            ...caseFile.verificationHistory,
          ],
        });
      }
      setNewNote('');
      setActionSuccessMessage('Official review note appended to immutable case dossier.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleViewRelatedProject = (relatedWorkId: string) => {
    selectProject(relatedWorkId);
    setCurrentPage('monitoring');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* ==================================================================== */}
        {/* MODAL TOP HEADER */}
        {/* ==================================================================== */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#090d16] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                  Official Verification Case Dossier
                </span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-[11px] font-mono font-bold text-slate-300">{house}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Case File:</span>
                <span className="font-mono text-purple-300">{workId}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectProject(workId);
                setCurrentPage('monitoring');
                onClose();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Project Intelligence</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action success alert banner */}
        {actionSuccessMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-600/50 px-6 py-2.5 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Loading verification case dossier from database…</p>
            </div>
          ) : error || !p ? (
            <div className="py-20 text-center max-w-md mx-auto space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Unable to load case details.</h3>
              <p className="text-xs text-slate-400">{error || 'Project record does not exist or access was denied.'}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Case File
              </button>
            </div>
          ) : (
            <>
              {/* ==================================================================== */}
              {/* 1. CASE HEADER CARD */}
              {/* ==================================================================== */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/30 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-purple-300 font-bold bg-purple-950/80 px-2.5 py-0.5 rounded border border-purple-800/60">
                        {p.work_id}
                      </span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-300 font-medium">{p.state || 'State Not Specified'}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-300 font-medium">{p.district || 'District N/A'}</span>
                      {p.constituency && (
                        <>
                          <span className="text-slate-500">&bull;</span>
                          <span className="text-slate-300 font-medium">{p.constituency}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {p.work_description || p.work_category || 'Work Description Unavailable'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Hon'ble MP:</span>
                      <strong className="text-slate-200">{p.mp_name || 'Not specified'}</strong>
                      <span>&bull;</span>
                      <span>FY: <strong className="text-slate-300">{p.financial_year || 'N/A'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                    <RiskScoreRing score={Number(p.risk_score) || 0} level={p.risk_level || 'LOW'} size={76} />
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        currentStatus === 'Verified' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' :
                        currentStatus === 'Inspection Requested' ? 'bg-purple-950/80 text-purple-300 border-purple-700/60' :
                        currentStatus === 'Under Review' ? 'bg-amber-950/80 text-amber-300 border-amber-700/60' :
                        currentStatus === 'Needs Further Investigation' ? 'bg-rose-950/80 text-rose-300 border-rose-700/60' :
                        currentStatus === 'Dismissed' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-slate-900 text-slate-300 border-slate-700'
                      }`}>
                        {currentStatus}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Category: <strong className="text-slate-300">{p.work_category || 'General'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================================================================== */}
              {/* 2. WHY ATTENTION PANEL (Actual risk factors / anomaly reasons) */}
              {/* ==================================================================== */}
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Why Attention? &bull; Canonical Anomaly Indicators</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Calculated by Sentinel Intelligence &bull; Score {p.risk_score || 0}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {caseFile?.whyAttention && caseFile.whyAttention.length > 0 ? (
                    caseFile.whyAttention.map((wa, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          wa.severity === 'HIGH'
                            ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                            : wa.severity === 'MEDIUM'
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            wa.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        />
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white">{wa.label}</span>
                            {wa.metric && (
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                {wa.metric}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed opacity-90">{wa.detail}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-slate-400 py-2">
                      Standard scrutiny candidate based on financial allocation and status monitoring criteria.
                    </div>
                  )}
                </div>
              </div>

              {/* ==================================================================== */}
              {/* 3. TWO COLUMN SECTION: PROJECT, FINANCIAL, EXECUTION INFO */}
              {/* ==================================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Sub-Column: Project & Execution Info */}
                <div className="space-y-6">
                  {/* Project Information */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span>Project Information</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Work ID</span>
                        <div className="font-mono text-purple-300 font-semibold mt-0.5 truncate">{p.work_id}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">House</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.house || house}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">State</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.state || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">District</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.district || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Constituency</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.constituency || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Hon'ble MP</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.mp_name || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Category</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.work_category || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Financial Year</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{p.financial_year || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Implementing Agency / Vendor</span>
                        <div className="text-slate-300 font-medium mt-0.5">{p.ida || p.vendor_name || 'State District Authority'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Information */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span>Execution Information</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Work Status</span>
                        <div className="text-slate-200 font-bold mt-0.5">{p.work_status || 'Under Execution'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Days Since Sanction</span>
                        <div className="text-amber-400 font-mono font-bold mt-0.5">
                          {p.days_since_sanction !== null ? `${p.days_since_sanction} days` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Recommendation Date</span>
                        <div className="text-slate-300 mt-0.5">{p.recommended_date ? formatDate(p.recommended_date) : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Sanction Date</span>
                        <div className="text-slate-300 mt-0.5">{p.sanction_date ? formatDate(p.sanction_date) : 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Completion Date</span>
                        <div className="text-slate-300 mt-0.5">{p.completion_date ? formatDate(p.completion_date) : 'Pending Completion'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Days to Complete</span>
                        <div className="text-slate-300 font-mono mt-0.5">
                          {p.days_to_complete !== null ? `${p.days_to_complete} days` : 'Ongoing'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sub-Column: Financial Intelligence & Potential Similar Work */}
                <div className="space-y-6">
                  {/* Financial Information */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Financial Information</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Sanction Amount</span>
                        <div className="text-sm sm:text-base font-bold text-purple-400 mt-0.5">
                          {formatCurrency(p.sanction_amount || 0)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Recommended Amount</span>
                        <div className="text-sm sm:text-base font-bold text-slate-200 mt-0.5">
                          {formatCurrency(p.recommended_amount || p.sanction_amount || 0)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Amount Disbursed</span>
                        <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
                          {formatCurrency(p.amount_disbursed || p.total_paid || 0)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid / Expended</span>
                        <div className="text-sm sm:text-base font-bold text-cyan-400 mt-0.5">
                          {formatCurrency(p.total_paid || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Disbursement ratio progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Disbursement vs Sanction Ratio</span>
                        <span className={`font-mono font-bold ${
                          (p.disbursement_ratio || 0) > 1 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {((p.disbursement_ratio || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            (p.disbursement_ratio || 0) > 1
                              ? 'bg-rose-500'
                              : (p.disbursement_ratio || 0) > 0.8
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.round((p.disbursement_ratio || 0) * 100))}%` }}
                        />
                      </div>
                      {(p.disbursement_ratio || 0) > 1 && (
                        <p className="text-[11px] text-rose-400 mt-1 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Payment exceeds sanctioned expenditure limit &bull; Audit scrutiny recommended.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Potential Similar Work (TF-IDF Similarity Signal) */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span>Potential Similar Work &bull; AI Semantic Signal</span>
                      </div>
                      <span className="text-[10px] text-slate-400">TF-IDF Vector Matching</span>
                    </div>

                    {caseFile?.potentialSimilarWork ? (
                      <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-cyan-800/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-cyan-300">Semantic Proximity</span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                            Similarity: {caseFile.potentialSimilarWork.similarityScore}%
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-300 space-y-1">
                          <p className="font-semibold text-white">Related Scheme in Same Jurisdiction:</p>
                          <p className="text-slate-400 font-mono text-[11px]">
                            #{caseFile.potentialSimilarWork.workB.workId} &bull; {caseFile.potentialSimilarWork.workB.mp}
                          </p>
                          <p className="italic text-slate-300 truncate">
                            "{caseFile.potentialSimilarWork.workB.description}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            Attention signal only. Not a confirmation of duplicate work.
                          </span>
                          <button
                            onClick={() => handleViewRelatedProject(caseFile.potentialSimilarWork!.workB.workId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span>View Related Project</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 text-center">
                        No high-similarity duplicate schemes identified in this district or constituency category.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================================================================== */}
              {/* 4. EVIDENCE & MULTI-FORMAT MEDIA SECTION */}
              {/* ==================================================================== */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <EvidenceMediaViewer
                  items={evidenceList}
                  title="Multi-Format Ground Evidence & Field Records"
                  emptyMessage="No ground proofs, inspection recordings, or citizen media attached yet."
                  allowDownload={true}
                />
              </div>

              {/* ==================================================================== */}
              {/* 5. AUDITOR REVIEW NOTES (Append-only history) */}
              {/* ==================================================================== */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Auditor Review Notes & Observations</span>
                </div>

                {/* Add new note form */}
                <form onSubmit={handleAddNote} className="space-y-2.5">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Record binding auditor observations, invoice clarifications, or verification remarks..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Add Official Note</span>
                    </button>
                  </div>
                </form>

                {/* Historical notes stream */}
                <div className="space-y-2 pt-2">
                  {caseFile?.verificationHistory && caseFile.verificationHistory.length > 0 ? (
                    caseFile.verificationHistory.map((h, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-semibold text-purple-300">{h.actor || 'Auditor'}</span>
                          <span className="font-mono text-[10px]">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{h.comment || h.action}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-2">
                      No prior review notes recorded for this case.
                    </div>
                  )}
                </div>
              </div>

              {/* ==================================================================== */}
              {/* 6. CASE TIMELINE (Real Audit Events) */}
              {/* ==================================================================== */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Case Timeline & Chronology</span>
                </div>

                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {caseFile?.timelineEvents && caseFile.timelineEvents.length > 0 ? (
                    caseFile.timelineEvents.map((ev, i) => (
                      <div key={i} className="flex items-start gap-4 relative pl-8">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 absolute left-2 top-1.5 ring-4 ring-slate-900" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{ev.title}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {ev.timestamp ? formatDate(ev.timestamp) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{ev.description}</p>
                          {ev.actor && <p className="text-[10px] text-purple-400 font-medium">Actor: {ev.actor}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 pl-8">No chronology events logged.</p>
                  )}
                </div>
              </div>

              {/* ==================================================================== */}
              {/* 7. VERIFICATION DECISION CONTROL BAR */}
              {/* ==================================================================== */}
              <div className="sticky bottom-0 bg-[#090d16] border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Controlled Verification Actions
                  </div>
                  <div className="text-xs text-slate-300">
                    Current finding: <strong className="text-purple-300">{currentStatus}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentStatus !== 'Under Review' && (
                    <button
                      onClick={() => handleApplyStatus('Under Review', 'Independent audit examination commenced.')}
                      disabled={submittingStatus}
                      className="px-3 py-1.5 rounded-xl bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700/60 text-xs font-bold transition-all cursor-pointer"
                    >
                      Start Review
                    </button>
                  )}

                  <button
                    onClick={() => setShowInspectionModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Request Inspection</span>
                  </button>

                  <button
                    onClick={() => setConfirmStatusModal('Needs Further Investigation')}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Needs Further Investigation
                  </button>

                  <button
                    onClick={() => setConfirmStatusModal('Verified')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify (Clear)</span>
                  </button>

                  <button
                    onClick={() => setConfirmStatusModal('Dismissed')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* REQUEST INSPECTION DIALOG MODAL */}
      {/* ==================================================================== */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-700/60 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Formal Field Inspection Order</span>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Inspection Reason
                </label>
                <select
                  value={inspectionReason}
                  onChange={e => setInspectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="Expenditure & Physical Progress Verification">Expenditure & Physical Progress Verification</option>
                  <option value="Stalled Scheme On-Site Examination">Stalled Scheme On-Site Examination</option>
                  <option value="Cost Discrepancy & Measurement Book Scrutiny">Cost Discrepancy & Measurement Book Scrutiny</option>
                  <option value="Vendor Allocation & Duplicate Work Cross-Check">Vendor Allocation & Duplicate Work Cross-Check</option>
                  <option value="Quality Compliance & Asset Handover Verification">Quality Compliance & Asset Handover Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Urgency Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Medium', 'High', 'Critical'] as const).map(prio => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setInspectionPriority(prio)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        inspectionPriority === prio
                          ? prio === 'Critical'
                            ? 'bg-rose-900 text-rose-200 border-rose-600'
                            : 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Inspection Directives & Field Notes
                </label>
                <textarea
                  rows={3}
                  value={inspectionNotes}
                  onChange={e => setInspectionNotes(e.target.value)}
                  placeholder="Detail specific physical checkpoints, site coordinates, photograph requirements..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInspection}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingInspection ? 'Submitting…' : 'Issue Inspection Mandate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STATUS CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {confirmStatusModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Confirm Official Finding</h4>
              <button onClick={() => setConfirmStatusModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                You are committing the verification status transition:
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-xs text-slate-400">{currentStatus} &rarr;</span>
                <span className="text-sm font-bold text-white ml-2">{confirmStatusModal}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Audit Remarks (Required for record)
                </label>
                <textarea
                  rows={3}
                  value={decisionComment}
                  onChange={e => setDecisionComment(e.target.value)}
                  placeholder="Record basis for verification decision, document review outcome, or closure notes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmStatusModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingStatus}
                  onClick={() => handleApplyStatus(confirmStatusModal)}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingStatus ? 'Committing…' : 'Confirm Finding'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
