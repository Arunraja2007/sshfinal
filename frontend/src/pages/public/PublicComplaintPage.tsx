import React, { useState, useEffect } from 'react';
import { PublicService } from '../../services/publicService';
import type { PublicComplaintSubmitResult } from '../../types/public';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  Upload,
  FileText,
  ShieldCheck,
  Info,
  HelpCircle,
  Lock,
  Search,
} from 'lucide-react';

interface PublicComplaintPageProps {
  initialWorkId?: string;
  onNavigate: (path: string) => void;
}

const COMPLAINT_CATEGORIES = [
  'Project Not Progressing',
  'Work Quality Concern',
  'Work Not Found at Location',
  'Financial / Expenditure Concern',
  'Project Information Mismatch',
  'Completion Status Concern',
  'Other',
];

export function PublicComplaintPage({ initialWorkId, onNavigate }: PublicComplaintPageProps) {
  // Form fields
  const [workId, setWorkId] = useState(initialWorkId || '');
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [complainantName, setComplainantName] = useState('');
  const [complainantMobile, setComplainantMobile] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Validation & submission state
  const [loading, setLoading] = useState(false);
  const [validatingProject, setValidatingProject] = useState(false);
  const [projectVerified, setProjectVerified] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicComplaintSubmitResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-fill query param if initialWorkId is present
  useEffect(() => {
    if (initialWorkId) {
      setWorkId(initialWorkId);
      validateProjectExistence(initialWorkId);
    }
  }, [initialWorkId]);

  async function validateProjectExistence(id: string) {
    if (!id.trim()) {
      setProjectVerified(null);
      return;
    }
    try {
      setValidatingProject(true);
      const proj = await PublicService.getProjectDetail(id.trim());
      if (proj) {
        setProjectVerified(`${proj.workDescription} — ${proj.constituency} (${proj.state})`);
        setFormError(null);
      }
    } catch (e: any) {
      setProjectVerified(null);
      setFormError(`Work ID "${id}" could not be verified in the official Lok Sabha database.`);
    } finally {
      setValidatingProject(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }
    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Allowed file formats: PNG, JPG, WEBP, or PDF.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds the 5MB limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!workId.trim()) {
      setFormError('Please enter a valid Project Work ID.');
      return;
    }

    if (!description.trim() || description.trim().length < 20) {
      setFormError('Description must be at least 20 characters.');
      return;
    }

    if (description.trim().length > 2000) {
      setFormError('Description cannot exceed 2,000 characters.');
      return;
    }

    try {
      setLoading(true);
      const submitRes = await PublicService.submitComplaint({
        workId: workId.trim(),
        complaintCategory: category,
        description: description.trim(),
        complainantName: complainantName.trim() || undefined,
        complainantMobile: complainantMobile.trim() || undefined,
        complainantEmail: complainantEmail.trim() || undefined,
        locationLandmark: locationLandmark.trim() || undefined,
      });

      setResult(submitRes);

      // Attach evidence document / photo proof if citizen uploaded a file
      if (selectedFile) {
        try {
          const reader = new FileReader();
          const fileDataPromise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
          });
          reader.readAsDataURL(selectedFile);
          const dataUrl = await fileDataPromise;
          if (dataUrl) {
            await PublicService.attachEvidence(submitRes.complaintId, {
              fileName: selectedFile.name,
              fileType: selectedFile.type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
              fileSize: selectedFile.size,
              storagePath: dataUrl,
              description: `Citizen photo/document evidence for complaint regarding project ${workId.trim()}`,
              uploadedBy: complainantName.trim() || 'Citizen Complainant',
            });
          }
        } catch (attachErr) {
          console.warn('[PublicComplaintPage] Failed to attach evidence:', attachErr);
        }
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setFormError(err.message || 'Failed to submit complaint. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyComplaintId = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.complaintId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Success Confirmation View ──────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 animate-fade-in">
        <div className="bg-white border border-[#E9ECEF] rounded-sm p-8 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h2
              className="text-2xl font-bold text-[#000a1f]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Complaint Registered Successfully
            </h2>
            <p className="text-xs text-[#747780]">
              Your submission has been logged into the MPLADS Sentinel civic tracking registry.
            </p>
          </div>

          {/* Unique Complaint ID Badge */}
          <div className="p-4 bg-[#f6faff] border border-[#005eb2]/30 rounded-sm space-y-2">
            <span className="text-[11px] font-bold text-[#005eb2] uppercase tracking-wider block">
              Unique Complaint Tracking ID
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl font-extrabold text-[#00204a] tracking-wider">
                {result.complaintId}
              </span>
              <button
                onClick={copyComplaintId}
                className="p-1.5 rounded-sm hover:bg-[#e6eff8] text-[#005eb2] transition-colors cursor-pointer"
                title="Copy Complaint ID"
              >
                {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-[#44474f]">
              Keep this Complaint ID safe to track the status of your submission.
            </p>
          </div>

          {/* Secure Reference Token */}
          <div className="p-3 bg-[#f8f9fa] border border-[#E9ECEF] rounded-sm text-xs text-[#44474f] space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#747780]">
              <Lock size={12} />
              <span>Tracking Verification Token:</span>
            </div>
            <span className="font-mono font-bold text-[#000a1f] text-sm">
              {result.verificationToken}
            </span>
            <p className="text-[10px] text-[#747780]">
              You can track your complaint using this token, or using the mobile number/email entered during submission.
            </p>
          </div>

          {/* Project reference */}
          <div className="text-left text-xs bg-[#f8f9fa] border border-[#E9ECEF] p-3.5 rounded-sm space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#747780]">Referenced Project Work ID:</span>
              <strong className="font-mono text-[#005eb2]">{result.workId}</strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#747780]">Category:</span>
              <strong className="text-[#141d23]">{result.category}</strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#747780]">Current Status:</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                {result.status}
              </span>
            </div>
          </div>

          {/* Neutral confirmation text */}
          <p className="text-[11px] text-[#747780] italic leading-relaxed border-t border-[#E9ECEF] pt-4">
            Your complaint has been submitted for review. Submission does not by itself establish wrongdoing. Findings are determined exclusively following formal administrative inspection.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate(`/complaints/track?cid=${encodeURIComponent(result.complaintId)}`)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-sm bg-[#005eb2] hover:bg-[#004b8f] text-white text-xs font-bold cursor-pointer"
            >
              Track Complaint Status
            </button>
            <button
              onClick={() => onNavigate('/projects')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-sm bg-white border border-[#E9ECEF] hover:bg-[#f8f9fa] text-xs font-semibold text-[#141d23] cursor-pointer"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submission Form View ───────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="border-b border-[#E9ECEF] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-[#DC3545] uppercase tracking-wider">
            Public Grievance Redressal
          </span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#000a1f]"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Report an Issue
        </h1>
        <p className="text-xs text-[#747780] mt-0.5">
          Submit a public complaint or concern regarding an MPLADS work for administrative review. No login required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[#E9ECEF] rounded-sm p-6 sm:p-8 shadow-xs space-y-6">
        {/* Error Alert */}
        {formError && (
          <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Project Work ID */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f]">
              Work ID / Project <span className="text-[#DC3545]">*</span>
            </label>
            {initialWorkId && (
              <span className="text-[10px] text-[#747780] bg-[#f8f9fa] px-2 py-0.5 rounded-sm border border-[#E9ECEF]">
                Pre-filled from Project Page
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="e.g. WS/MP18155/2025-2026/247640"
            value={workId}
            readOnly={Boolean(initialWorkId)}
            onChange={(e) => {
              setWorkId(e.target.value);
              setProjectVerified(null);
            }}
            onBlur={() => validateProjectExistence(workId)}
            className={`w-full px-3 py-2 text-xs font-mono border rounded-sm focus:outline-none focus:border-[#005eb2] ${
              initialWorkId ? 'bg-[#f8f9fa] text-[#005eb2] font-bold border-[#E9ECEF]' : 'border-[#E9ECEF] bg-white'
            }`}
            required
          />

          {validatingProject && (
            <p className="text-[11px] text-[#005eb2] flex items-center gap-1 mt-1">
              <span className="w-3 h-3 border-2 border-[#005eb2] border-t-transparent rounded-full animate-spin" />
              Verifying Work ID in official database…
            </p>
          )}

          {projectVerified && (
            <div className="p-2.5 rounded-sm bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2 mt-1">
              <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-600" />
              <span className="truncate">
                Verified: <strong>{projectVerified}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Section 2: Complaint Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f]">
            Complaint Category <span className="text-[#DC3545]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-[#E9ECEF] rounded-sm bg-white focus:outline-none focus:border-[#005eb2] cursor-pointer"
            required
          >
            {COMPLAINT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[#747780]">
            Select the category that best describes the issue observed on the ground.
          </p>
        </div>

        {/* Section 3: Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f]">
              Complaint Description <span className="text-[#DC3545]">*</span>
            </label>
            <span className={`text-[10px] font-mono ${description.length < 20 ? 'text-[#DC3545]' : 'text-[#747780]'}`}>
              {description.length} / 2,000 chars (min 20)
            </span>
          </div>
          <textarea
            rows={5}
            placeholder="Provide specific factual details regarding the concern (e.g. location, observable progress delay, work quality issues, or missing equipment)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 text-xs border border-[#E9ECEF] rounded-sm focus:outline-none focus:border-[#005eb2] bg-white leading-relaxed"
            required
            minLength={20}
            maxLength={2000}
          />
        </div>

        {/* Section 4: Optional Location Landmark */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f]">
            Location / Landmark <span className="text-[10px] text-[#747780] font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Near Community Hall, Ward 4, Village XYZ"
            value={locationLandmark}
            onChange={(e) => setLocationLandmark(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-[#E9ECEF] rounded-sm focus:outline-none focus:border-[#005eb2] bg-white"
          />
        </div>

        {/* Section 5: Optional Complainant Contact Details */}
        <div className="space-y-3 pt-2 border-t border-[#E9ECEF]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#000a1f]">
              Complainant Contact Details <span className="text-[10px] text-[#747780] font-normal">(Optional)</span>
            </h4>
            <span className="text-[10px] text-[#198754] font-medium flex items-center gap-1">
              <Lock size={11} /> Kept Strictly Confidential
            </span>
          </div>
          <p className="text-[11px] text-[#747780]">
            If provided, your contact details enable you to track complaint status and receive verification updates. Contact details are never displayed publicly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#747780] uppercase block mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Citizen Name"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E9ECEF] rounded-sm bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#747780] uppercase block mb-1">Mobile Number</label>
              <input
                type="tel"
                placeholder="10-digit Mobile"
                value={complainantMobile}
                onChange={(e) => setComplainantMobile(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E9ECEF] rounded-sm bg-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#747780] uppercase block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="citizen@example.com"
                value={complainantEmail}
                onChange={(e) => setComplainantEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E9ECEF] rounded-sm bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Optional Evidence / Photo Upload */}
        <div className="space-y-1.5 pt-2 border-t border-[#E9ECEF]">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000a1f] flex items-center gap-1.5">
            <Upload size={13} />
            <span>Attach Evidence / Ground Photo</span>
            <span className="text-[10px] text-[#747780] font-normal">(Optional, max 5MB)</span>
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={handleFileChange}
            className="w-full px-3 py-2 text-xs border border-[#E9ECEF] rounded-sm bg-[#f8f9fa] file:mr-3 file:py-1 file:px-2.5 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-[#005eb2] file:text-white hover:file:bg-[#004b8f] cursor-pointer"
          />
          {fileError && <p className="text-[11px] text-[#DC3545]">{fileError}</p>}
          {selectedFile && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
              <Check size={12} /> Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="p-3 bg-[#f8f9fa] border border-[#E9ECEF] rounded-sm text-[11px] text-[#747780] leading-relaxed">
          <strong>Notice:</strong> All submissions undergo administrative review by the district authority. Submissions are read-only once created and cannot be edited. Submission does not by itself establish wrongdoing.
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/projects')}
            className="text-xs font-semibold text-[#747780] hover:text-[#141d23] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-sm bg-[#DC3545] hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registering Complaint…</span>
              </>
            ) : (
              <span>Submit Complaint</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
