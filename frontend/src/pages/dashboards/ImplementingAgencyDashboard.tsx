import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Upload,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Layers,
  MapPin,
  ExternalLink,
  Info,
  Check,
  Building,
  User,
  History,
  Activity,
  Tag,
  Paperclip,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '../../utils';
import { ImplementingAgencyService } from '../../services/implementingAgencyService';
import { PublicService } from '../../services/publicService';
import type { AgencyComplaintItem, EvidenceMediaItem } from '../../types/public';
import { EvidenceMediaViewer } from '../../components/EvidenceMediaViewer';
import type {
  AgencyKPIs,
  AgencyProjectItem,
  ExecutionUpdate,
  ExecutionEvidence,
  ExecutionActionItem,
} from '../../types/agency';

export function ImplementingAgencyDashboard() {

  const { profile } = useAuthStore();
  const agencyName = profile?.agency_name || 'Implementing Authority';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'assigned-works' | 'action-center' | 'complaints' | 'updates' | 'evidence' | 'profile'
  >('overview');

  // Dashboard Data State
  const [kpis, setKpis] = useState<AgencyKPIs | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [actionItems, setActionItems] = useState<ExecutionActionItem[]>([]);
  const [actionLoading, setActionLoading] = useState(true);

  // Grievance Information Requests State
  const [agencyComplaints, setAgencyComplaints] = useState<AgencyComplaintItem[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState<boolean>(false);
  const [selectedAgencyComplaint, setSelectedAgencyComplaint] = useState<AgencyComplaintItem | null>(null);
  const [agencyComplaintEvidence, setAgencyComplaintEvidence] = useState<EvidenceMediaItem[]>([]);
  const [agencyRemarksInput, setAgencyRemarksInput] = useState<string>('');
  const [agencyProgressInput, setAgencyProgressInput] = useState<number>(50);
  const [agencySubmitting, setAgencySubmitting] = useState<boolean>(false);
  const [agencySuccessMsg, setAgencySuccessMsg] = useState<string | null>(null);
  const [agencyErrorMsg, setAgencyErrorMsg] = useState<string | null>(null);
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState<File | null>(null);


  // Assigned Works Table State
  const [projects, setProjects] = useState<AgencyProjectItem[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tableLoading, setTableLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [houseFilter, setHouseFilter] = useState<'ALL' | 'Lok Sabha' | 'Rajya Sabha'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Selected Work & Execution Workspace Modal
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [selectedWorkHouse, setSelectedWorkHouse] = useState<'Lok Sabha' | 'Rajya Sabha' | undefined>();
  const [workspaceData, setWorkspaceData] = useState<any | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'info' | 'submit-update' | 'evidence' | 'feedback' | 'history'>('info');

  // Submit Update Form State
  const [formProgress, setFormProgress] = useState(50);
  const [formMilestone, setFormMilestone] = useState('Active Physical Execution');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRemarks, setFormRemarks] = useState('');
  const [formDelayReason, setFormDelayReason] = useState('');
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Evidence Upload Form State
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [evidenceType, setEvidenceType] = useState('Site Progress Photograph');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);

  // Agency Profile Data State
  const [agencyProfileData, setAgencyProfileData] = useState<any | null>(null);

  // Listen to URL query params for tab switching (e.g. ?tab=assigned-works)
  // Grievance status sub-filter: 'INFORMATION_REQUESTED' vs 'ALL'
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<'INFORMATION_REQUESTED' | 'ALL'>('INFORMATION_REQUESTED');

  // Listen to URL query params and popstate for tab switching (e.g. ?tab=assigned-works)
  useEffect(() => {
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      let tabParam = params.get('tab');
      if (tabParam === 'enquiries') tabParam = 'complaints';
      if (tabParam && ['overview', 'assigned-works', 'action-center', 'complaints', 'updates', 'evidence', 'profile'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      } else if (!tabParam) {
        setActiveTab('overview');
      }
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => {
      window.removeEventListener('popstate', syncTabFromUrl);
    };
  }, []);

  const handleTabChange = (tabId: 'overview' | 'assigned-works' | 'action-center' | 'complaints' | 'updates' | 'evidence' | 'profile') => {
    setActiveTab(tabId);
    const newUrl = tabId === 'overview' ? '/implementing-agency' : `/implementing-agency?tab=${tabId}`;
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // 1. Fetch KPIs
  const fetchKPIs = useCallback(async () => {
    setKpiLoading(true);
    try {
      const data = await ImplementingAgencyService.getDashboardKPIs(
        houseFilter !== 'ALL' ? houseFilter : undefined
      );
      setKpis(data);
    } catch (err) {
      console.error('Failed to load agency KPIs:', err);
    } finally {
      setKpiLoading(false);
    }
  }, [houseFilter]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  // 2. Fetch Action Center Items
  const fetchActionCenter = useCallback(async () => {
    setActionLoading(true);
    try {
      const items = await ImplementingAgencyService.getActionCenter();
      setActionItems(items);
    } catch (err) {
      console.error('Failed to load action center items:', err);
    } finally {
      setActionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionCenter();
  }, [fetchActionCenter]);

  // 2b. Fetch Grievance Information Requests
  const fetchAgencyComplaints = useCallback(async () => {
    setComplaintsLoading(true);
    try {
      const list = await PublicService.getAgencyComplaintRequests(agencyName, undefined, complaintStatusFilter);
      setAgencyComplaints(list);
    } catch (err) {
      console.warn('Failed to load agency complaints:', err);
    } finally {
      setComplaintsLoading(false);
    }
  }, [agencyName, complaintStatusFilter]);

  useEffect(() => {
    fetchAgencyComplaints();
  }, [fetchAgencyComplaints]);

  const handleSubmitAgencyResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgencyComplaint) return;
    if (!agencyRemarksInput.trim()) {
      setAgencyErrorMsg('Please provide technical progress remarks and execution explanation.');
      return;
    }

    setAgencySubmitting(true);
    setAgencyErrorMsg(null);
    setAgencySuccessMsg(null);

    try {
      await PublicService.submitAgencyResponse(selectedAgencyComplaint.complaintId, {
        remarks: agencyRemarksInput.trim(),
        progress: agencyProgressInput,
        agencyName,
      });
      setAgencySuccessMsg('Agency explanation and progress successfully recorded and forwarded to the District Authority.');
      setAgencyRemarksInput('');
      fetchAgencyComplaints();
      setTimeout(() => {
        setSelectedAgencyComplaint(null);
        setAgencySuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setAgencyErrorMsg(err.message || 'Failed to submit response.');
    } finally {
      setAgencySubmitting(false);
    }
  };

  // 3. Fetch Assigned Projects (Server-side paginated & filtered)

  const fetchProjects = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await ImplementingAgencyService.getAssignedProjects({
        page,
        pageSize,
        search: search.trim() || undefined,
        house: houseFilter !== 'ALL' ? houseFilter : undefined,
        workStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
        riskLevel: riskFilter !== 'ALL' ? riskFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      setProjects(res.projects);
      setTotalProjects(res.total);
    } catch (err) {
      console.error('Failed to load assigned projects:', err);
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize, search, houseFilter, statusFilter, riskFilter, categoryFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 4. Fetch Agency Profile Tab Info
  useEffect(() => {
    if (activeTab === 'profile' && !agencyProfileData) {
      ImplementingAgencyService.getProfile()
        .then(setAgencyProfileData)
        .catch(console.error);
    }
  }, [activeTab, agencyProfileData]);

  // 5. Open Execution Workspace Modal
  const handleOpenWorkspace = async (workId: string, house: 'Lok Sabha' | 'Rajya Sabha') => {
    setSelectedWorkId(workId);
    setSelectedWorkHouse(house);
    setWorkspaceLoading(true);
    setWorkspaceTab('info');
    setFormError(null);
    setFormSuccess(null);
    setEvidenceError(null);
    setEvidenceSuccess(null);

    try {
      const data = await ImplementingAgencyService.getProjectDetails(workId, house);
      setWorkspaceData(data);
      // Pre-fill update form with latest progress if available
      if (data.executionUpdates && data.executionUpdates.length > 0) {
        setFormProgress(Number(data.executionUpdates[0].physical_progress) || 0);
      } else {
        setFormProgress(data.project.is_completed ? 100 : 35);
      }
    } catch (err: any) {
      console.error('Error fetching project workspace:', err);
      alert(err.message || 'Unable to open Execution Workspace for this project.');
      setSelectedWorkId(null);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // Close Workspace Modal
  const handleCloseWorkspace = () => {
    setSelectedWorkId(null);
    setSelectedWorkHouse(undefined);
    setWorkspaceData(null);
  };

  // Handle Submit Execution Update
  const handleSubmitUpdate = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!selectedWorkId || !selectedWorkHouse) return;

    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await ImplementingAgencyService.submitExecutionUpdate(selectedWorkId, {
        house: selectedWorkHouse,
        physical_progress: Number(formProgress),
        milestone_status: formMilestone,
        update_date: formDate,
        remarks: formRemarks,
        delay_reason: formDelayReason || undefined,
        expected_completion_date: formExpectedDate || undefined,
        is_draft: isDraft,
      });

      setFormSuccess(
        isDraft
          ? 'Draft execution update saved successfully.'
          : 'Execution update successfully submitted for review and recorded in immutable audit log.'
      );
      setFormRemarks('');
      setFormDelayReason('');

      // Refresh workspace data & projects
      const updatedData = await ImplementingAgencyService.getProjectDetails(selectedWorkId, selectedWorkHouse);
      setWorkspaceData(updatedData);
      fetchProjects();
      fetchKPIs();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit execution update.');
    } finally {
      setFormSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedAgencyComplaint) {
      PublicService.getEvidence(selectedAgencyComplaint.complaintId)
        .then((evList) => setAgencyComplaintEvidence(evList || []))
        .catch(() => setAgencyComplaintEvidence([]));
    } else {
      setAgencyComplaintEvidence([]);
    }
  }, [selectedAgencyComplaint]);

  // Handle Attach Evidence Record
  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkId || !selectedWorkHouse) return;

    const title = evidenceFileName.trim() || selectedEvidenceFile?.name;
    if (!title) {
      setEvidenceError('Please select a file or enter a valid document / photo title.');
      return;
    }

    setEvidenceSubmitting(true);
    setEvidenceError(null);
    setEvidenceSuccess(null);

    try {
      let dataUrl = '';
      if (selectedEvidenceFile) {
        const reader = new FileReader();
        const readPromise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
        });
        reader.readAsDataURL(selectedEvidenceFile);
        dataUrl = await readPromise;
      }

      const safeSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const storagePath = dataUrl || `evidence/${selectedWorkHouse.toLowerCase()}/${selectedWorkId}/${Date.now()}_${safeSlug}.pdf`;

      await ImplementingAgencyService.uploadEvidence(selectedWorkId, {
        house: selectedWorkHouse,
        file_name: title,
        file_type: selectedEvidenceFile?.type || evidenceType,
        storage_path: storagePath,
        description: evidenceDesc || undefined,
        file_size_bytes: selectedEvidenceFile?.size || 1024 * 1024 * 2,
      });

      // Also attach to public service registry so other roles can inspect
      await PublicService.attachEvidence(selectedWorkId, {
        fileName: title,
        fileType: selectedEvidenceFile?.type || evidenceType,
        fileSize: selectedEvidenceFile?.size || 1024 * 1024 * 2,
        storagePath: storagePath,
        description: evidenceDesc || `Implementing Agency uploaded evidence for ${selectedWorkId}`,
        uploadedBy: agencyName,
        uploaderRole: 'Implementing Agency',
      });

      setEvidenceSuccess('Supporting proof & evidence securely recorded and linked to this assigned work.');
      setEvidenceFileName('');
      setEvidenceDesc('');
      setSelectedEvidenceFile(null);

      // Refresh workspace data
      const updatedData = await ImplementingAgencyService.getProjectDetails(selectedWorkId, selectedWorkHouse);
      setWorkspaceData(updatedData);
    } catch (err: any) {
      setEvidenceError(err.message || 'Failed to attach evidence.');
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalProjects / pageSize);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white border border-[#E9ECEF] rounded-sm p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-[#00204a] tracking-wider uppercase bg-[#EEF2F6] px-2.5 py-0.5 rounded-sm border border-[#D5DCE4] flex items-center gap-1.5">
              <Building size={12} /> Implementing Agency Desk
            </span>
            <span className="text-[10px] font-bold text-[#0066CC] bg-[#E7F5FF] px-2.5 py-0.5 rounded-sm border border-[#BCE1FF]">
              Scope: {agencyName}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#000a1f] tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Implementation Workspace
          </h1>
          <p className="text-xs text-[#555] mt-1">
            Monitor assigned works, submit execution updates, and maintain supporting evidence.
          </p>
        </div>

        {/* Global House Scope Filter */}
        <div className="flex items-center gap-2 bg-[#F8F9FA] p-2 rounded border border-[#E9ECEF]">
          <span className="text-[11px] font-bold text-[#747780] uppercase tracking-wider">House:</span>
          {(['ALL', 'Lok Sabha', 'Rajya Sabha'] as const).map((h) => (
            <button
              key={h}
              onClick={() => {
                setHouseFilter(h);
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                houseFilter === h
                  ? 'bg-[#00204a] text-white shadow-xs'
                  : 'bg-white text-[#44474f] hover:bg-slate-100 border border-[#CED4DA]'
              }`}
            >
              {h === 'ALL' ? 'Both Houses' : h}
            </button>
          ))}
          <button
            onClick={() => {
              fetchKPIs();
              fetchProjects();
              fetchActionCenter();
            }}
            title="Refresh All Real Data"
            className="p-1.5 text-[#00204a] hover:bg-slate-200 rounded transition"
          >
            <RefreshCw size={14} className={kpiLoading || tableLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E9ECEF] bg-white px-4 pt-2 rounded-t-sm overflow-x-auto">
        {[
          { id: 'overview', label: 'Workspace Overview', icon: Briefcase },
          { id: 'assigned-works', label: `Assigned Works (${kpis?.assigned_works || totalProjects})`, icon: Layers },
          { id: 'action-center', label: `Execution Action Center (${actionItems.length})`, icon: ShieldAlert },
          { id: 'complaints', label: `Citizen Grievances (${agencyComplaints.length})`, icon: AlertCircle },
          { id: 'updates', label: 'Execution Updates', icon: TrendingUp },
          { id: 'evidence', label: 'Evidence & Documents', icon: Paperclip },
          { id: 'profile', label: 'Agency Profile', icon: User },
        ].map((tab) => {

          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#00204a] text-[#00204a] bg-slate-50'
                  : 'border-transparent text-[#747780] hover:text-[#000a1f] hover:bg-slate-50/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#00204a]' : 'text-[#747780]'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB: Real KPIs & Execution Action Center Summary */}
      {(activeTab === 'overview' || activeTab === 'assigned-works') && (
        <>
          {/* KPI Grid (Real Data Only) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Assigned Works */}
            <div className="card p-4 border-l-4 border-l-[#00204a]">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Assigned Works</span>
                <Briefcase size={15} className="text-[#00204a]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#000a1f] mt-1.5">
                {kpiLoading ? '…' : kpis?.assigned_works.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-[#747780] mt-0.5 truncate">
                Real database assignment
              </div>
            </div>

            {/* 2. Works In Progress */}
            <div className="card p-4 border-l-4 border-l-[#0066CC]">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Works In Progress</span>
                <Clock size={15} className="text-[#0066CC]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#0066CC] mt-1.5">
                {kpiLoading ? '…' : kpis?.works_in_progress.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-[#747780] mt-0.5 truncate">
                Active ground execution
              </div>
            </div>

            {/* 3. Completed Works */}
            <div className="card p-4 border-l-4 border-l-[#198754]">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Completed Works</span>
                <CheckCircle2 size={15} className="text-[#198754]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#198754] mt-1.5">
                {kpiLoading ? '…' : kpis?.completed_works.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-[#747780] mt-0.5 truncate">
                Final stage or verified
              </div>
            </div>

            {/* 4. Pending Updates */}
            <div className="card p-4 border-l-4 border-l-[#fd7e14]">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Pending Updates</span>
                <AlertCircle size={15} className="text-[#fd7e14]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#fd7e14] mt-1.5">
                {kpiLoading ? '…' : kpis?.pending_updates.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-[#747780] mt-0.5 truncate">
                {'> 180d since sanction'}
              </div>
            </div>

            {/* 5. Inspection / Review Pending */}
            <div className="card p-4 border-l-4 border-l-[#6f42c1]">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Under Review</span>
                <Activity size={15} className="text-[#6f42c1]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#6f42c1] mt-1.5">
                {kpiLoading ? '…' : kpis?.inspection_review_pending.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-[#747780] mt-0.5 truncate">
                Desk verification queue
              </div>
            </div>

            {/* 6. High Attention Works */}
            <div className="card p-4 border-l-4 border-l-[#DC3545]">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-[10px] font-bold uppercase tracking-wider">High Attention</span>
                <ShieldAlert size={15} className="text-[#DC3545]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#DC3545] mt-1.5">
                {kpiLoading ? '…' : kpis?.high_attention_works.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-[#747780] mt-0.5 truncate">
                System attention flags
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. ASSIGNED WORKS TAB & TABLE */}
      {(activeTab === 'overview' || activeTab === 'assigned-works') && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E9ECEF] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={16} className="text-[#00204a]" /> Assigned Works
              </h2>
              <p className="text-xs text-[#747780]">
                Works assigned to <strong>{agencyName}</strong>. All data queries are strictly scoped at database and RLS layers.
              </p>
            </div>

            {/* Total count badge */}
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded font-mono font-bold border border-slate-200">
                {totalProjects} Works Found
              </span>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-[#F8F9FA] p-3 rounded border border-[#E9ECEF]">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#747780]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Work ID, Description, MP…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#CED4DA] rounded outline-none focus:border-[#00204a]"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-1.5 text-xs bg-white border border-[#CED4DA] rounded outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Sanctioned">Sanctioned</option>
                <option value="Physically Completed">Physically Completed</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-1.5 text-xs bg-white border border-[#CED4DA] rounded outline-none"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Attention</option>
                <option value="MEDIUM">Medium Attention</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-1.5 text-xs bg-white border border-[#CED4DA] rounded outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Roads">Roads & Pathways</option>
                <option value="Education">Education Facilities</option>
                <option value="Drinking Water">Drinking Water</option>
                <option value="Health">Health & Family Welfare</option>
                <option value="Community">Community Infrastructure</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[10px] text-[#747780] uppercase font-bold">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="p-1.5 text-xs bg-white border border-[#CED4DA] rounded outline-none"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Assigned Works Table */}
          <div className="overflow-x-auto border border-[#E9ECEF] rounded-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] font-bold text-[#747780] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Work ID</th>
                  <th className="py-2.5 px-3">Description & MP</th>
                  <th className="py-2.5 px-2">House</th>
                  <th className="py-2.5 px-2">Location</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-3 text-right">Sanctioned</th>
                  <th className="py-2.5 px-3 text-right">Disbursed</th>
                  <th className="py-2.5 px-2 text-center">Progress</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-center">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF] bg-white">
                {tableLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-[#747780]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-[#00204a]" />
                        <span className="font-semibold">Loading assigned works from database…</span>
                      </div>
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-[#747780]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Briefcase size={28} className="text-slate-300" />
                        <span className="font-bold text-[#000a1f]">No assigned works found matching current filters.</span>
                        <p className="text-xs">Try clearing filters or changing search keywords.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => {
                    const progressVal = Number(p.physical_progress) || 0;
                    const isHighRisk = p.risk_level === 'HIGH';

                    return (
                      <tr key={`${p.work_id}-${p.house}`} className="hover:bg-slate-50 transition-colors">
                        {/* Work ID */}
                        <td className="py-3 px-3 font-mono font-bold text-[#00204a]">
                          {p.work_id}
                        </td>

                        {/* Description & MP */}
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-medium text-[#000a1f] line-clamp-2" title={p.work_description}>
                            {p.work_description}
                          </div>
                          <div className="text-[10px] text-[#747780] mt-0.5 flex items-center gap-2">
                            <span>MP: <strong>{p.mp_name}</strong></span>
                            <span>· FY: {p.financial_year || '2024-25'}</span>
                          </div>
                        </td>

                        {/* House */}
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              p.house === 'Lok Sabha'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {p.house}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-2">
                          <div className="font-medium text-[#000a1f]">{p.district}</div>
                          <div className="text-[10px] text-[#747780]">{p.state}</div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-2 text-[#44474f]">
                          {p.work_category || 'General'}
                        </td>

                        {/* Sanctioned */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-[#000a1f]">
                          {formatCurrency(p.sanction_amount || 0)}
                        </td>

                        {/* Disbursed */}
                        <td className="py-3 px-3 text-right font-mono text-[#0066CC]">
                          {formatCurrency(p.amount_disbursed || p.total_paid || 0)}
                          <div className="text-[10px] text-[#747780]">
                            {p.disbursement_ratio || 0}%
                          </div>
                        </td>

                        {/* Physical Progress */}
                        <td className="py-3 px-2 text-center">
                          <div className="w-16 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                progressVal >= 100
                                  ? 'bg-[#198754]'
                                  : progressVal >= 60
                                  ? 'bg-[#0066CC]'
                                  : 'bg-[#fd7e14]'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, progressVal))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold font-mono text-[#000a1f] mt-0.5 block">
                            {progressVal}%
                          </span>
                        </td>

                        {/* Work Status */}
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              p.is_completed
                                ? 'bg-[#E8F5E9] text-[#198754] border border-[#C8E6C9]'
                                : 'bg-[#FFF9DB] text-[#b86200] border border-[#FFE066]'
                            }`}
                          >
                            {p.work_status || (p.is_completed ? 'Completed' : 'In Progress')}
                          </span>
                        </td>

                        {/* Risk Level (Read-Only) */}
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              isHighRisk
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : p.risk_level === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.risk_level || 'LOW'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenWorkspace(p.work_id, p.house)}
                            className="btn-primary text-[10px] py-1 px-2.5 font-bold flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <FileText size={12} /> Execution Workspace
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[#747780]">
              Showing <span className="font-bold text-[#000a1f]">{projects.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-bold text-[#000a1f]">{Math.min(page * pageSize, totalProjects)}</span> of{' '}
              <span className="font-bold text-[#000a1f]">{totalProjects}</span> assigned works
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-xs font-semibold px-2">
                Page {page} of {totalPages || 1}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXECUTION ACTION CENTER TAB */}
      {(activeTab === 'action-center' || (activeTab === 'overview' && actionItems.length > 0)) && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#DC3545]" /> Execution Action Center
              </h2>
              <p className="text-xs text-[#747780]">
                Assigned works requiring milestone updates, revision response, or attention.
              </p>
            </div>
            <span className="text-xs font-mono bg-red-50 text-red-700 px-2.5 py-0.5 rounded border border-red-200 font-bold">
              {actionItems.length} Action Items
            </span>
          </div>

          {actionLoading ? (
            <div className="py-8 text-center text-[#747780]">
              <RefreshCw size={18} className="animate-spin text-[#00204a] mx-auto mb-2" />
              Scanning assigned works for attention triggers…
            </div>
          ) : actionItems.length === 0 ? (
            <div className="p-8 text-center text-[#747780]">
              <CheckCircle2 size={32} className="text-[#198754] mx-auto mb-2" />
              <div className="font-bold text-[#000a1f]">No Pending Action Items</div>
              <p className="text-xs mt-1">All assigned projects are up to date on milestones and inspection review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionItems.slice(0, 8).map((item) => (
                <div
                  key={`${item.work_id}-${item.action_type}`}
                  className="p-4 rounded border border-[#E9ECEF] bg-white hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : item.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.action_type.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-xs font-bold text-[#000a1f] font-mono mt-1">
                        {item.work_id} ({item.house})
                      </h4>
                    </div>

                    <span className="text-[10px] font-mono text-[#00204a] font-bold bg-[#F8F9FA] px-2 py-0.5 rounded border border-[#E9ECEF]">
                      Sanction: {formatCurrency(item.sanction_amount)}
                    </span>
                  </div>

                  <p className="text-xs text-[#44474f] line-clamp-2">
                    {item.work_description}
                  </p>

                  {/* Why Attention Explanation */}
                  <div className="text-[11px] bg-amber-50/70 border border-amber-200 rounded p-2 text-amber-900 flex items-start gap-1.5">
                    <Info size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Why Attention?</strong> {item.attention_reason}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E9ECEF]">
                    <span className="text-[10px] text-[#747780]">
                      Progress: <strong>{item.physical_progress}%</strong> · Risk: <strong>{item.risk_level}</strong>
                    </span>
                    <button
                      onClick={() => handleOpenWorkspace(item.work_id, item.house)}
                      className="btn-outline text-[10px] py-1 px-2.5 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FileText size={11} /> Open Workspace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. EXECUTION UPDATES LEDGER TAB */}
      {activeTab === 'updates' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-[#00204a]" /> Execution Updates Ledger
              </h2>
              <p className="text-xs text-[#747780]">
                Append-only record of all physical progress submissions, delay explanations, and review responses.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E9ECEF] rounded-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] text-[10px] font-bold text-[#747780] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Work ID</th>
                  <th className="py-2.5 px-3">Milestone Status</th>
                  <th className="py-2.5 px-2 text-center">Progress</th>
                  <th className="py-2.5 px-2">Update Date</th>
                  <th className="py-2.5 px-3">Execution Remarks</th>
                  <th className="py-2.5 px-2 text-center">Review Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECEF]">
                {projects.slice(0, 15).map((p) => (
                  <tr key={p.work_id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-[#00204a]">{p.work_id}</td>
                    <td className="py-3 px-3 font-medium text-[#000a1f]">
                      {p.latest_execution_update?.milestone_status || 'Active Physical Execution'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold">
                      {p.physical_progress}%
                    </td>
                    <td className="py-3 px-2 text-[#747780]">
                      {p.latest_execution_update?.submitted_at
                        ? new Date(p.latest_execution_update.submitted_at).toLocaleDateString()
                        : 'Dataset Synchronized'}
                    </td>
                    <td className="py-3 px-3 text-[#555] max-w-xs truncate">
                      {p.work_description}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {p.latest_execution_update?.review_status || 'SUBMITTED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenWorkspace(p.work_id, p.house)}
                        className="btn-outline text-[10px] py-1 px-2 font-bold"
                      >
                        View Updates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. EVIDENCE LEDGER TAB */}
      {activeTab === 'evidence' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                <Paperclip size={16} className="text-[#00204a]" /> Evidence & Supporting Documents
              </h2>
              <p className="text-xs text-[#747780]">
                Access and manage progress photographs, completion certificates, and measurement books.
              </p>
            </div>
          </div>

          <div className="p-8 text-center bg-[#F8F9FA] rounded border border-dashed border-[#CED4DA] space-y-2">
            <Upload size={28} className="mx-auto text-[#00204a]" />
            <h3 className="text-sm font-bold text-[#000a1f]">Evidence Repository</h3>
            <p className="text-xs text-[#747780] max-w-md mx-auto">
              Select any assigned project from the <strong>Assigned Works</strong> ledger to upload geo-tagged photos, measurement sheets, or stage completion certificates.
            </p>
            <button
              onClick={() => setActiveTab('assigned-works')}
              className="btn-primary text-xs py-1.5 px-4 font-bold mt-2"
            >
              Browse Assigned Works
            </button>
          </div>
        </div>
      )}

      {/* 6. AGENCY PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-6 max-w-3xl">
          <div className="flex items-center gap-3 border-b border-[#E9ECEF] pb-4">
            <div className="w-12 h-12 rounded-sm bg-[#00204a] text-white flex items-center justify-center font-bold text-lg">
              <Building size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#000a1f]">{agencyName}</h2>
              <p className="text-xs text-[#747780]">
                Official Implementing Agency · MPLADS Project Execution Wing
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF]">
              <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Agency Name</span>
              <span className="text-xs font-bold text-[#000a1f] mt-1 block">{agencyName}</span>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF]">
              <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Agency ID (UUID)</span>
              <span className="text-xs font-mono text-[#00204a] mt-1 block select-all">
                {profile?.agency_id || 'Resolved via database identity'}
              </span>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF]">
              <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Total Works Assigned</span>
              <span className="text-lg font-bold font-mono text-[#000a1f] mt-1 block">
                {kpis?.assigned_works || agencyProfileData?.houseCoverage?.total_works || 0}
              </span>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded border border-[#E9ECEF]">
              <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Parliamentary House Coverage</span>
              <span className="text-xs font-semibold text-[#000a1f] mt-1 block">
                Lok Sabha: {agencyProfileData?.houseCoverage?.lok_sabha_works || 'Synchronized'} · Rajya Sabha: {agencyProfileData?.houseCoverage?.rajya_sabha_works || 'Synchronized'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 rounded border border-blue-200 text-xs text-blue-900 space-y-1">
            <strong>Dataset Integrity Notice:</strong>
            <p>
              Your implementing agency identity is derived 100% from actual Lok Sabha and Rajya Sabha master records.
              Project assignments and agency identity mapping are strictly read-only and enforce assignment-level security.
            </p>
          </div>
        </div>
      )}

      {/* 7. DISTRICT GRIEVANCES / INFORMATION REQUESTS TAB */}
      {activeTab === 'complaints' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9ECEF] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#000a1f] flex items-center gap-2">
                <AlertCircle size={18} className="text-[#00204a]" />
                <span>Citizen Grievances & District Enquiries</span>
              </h2>
              <p className="text-xs text-[#747780] mt-0.5">
                Technical queries forwarded by District Officers requiring agency progress remarks and execution explanations.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#F8F9FA] p-1 rounded border border-[#E9ECEF] text-xs">
                <button
                  type="button"
                  onClick={() => setComplaintStatusFilter('INFORMATION_REQUESTED')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                    complaintStatusFilter === 'INFORMATION_REQUESTED'
                      ? 'bg-[#00204a] text-white shadow-xs'
                      : 'text-[#747780] hover:text-[#000a1f]'
                  }`}
                >
                  Action Required ({agencyComplaints.filter(c => c.status === 'INFORMATION_REQUESTED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setComplaintStatusFilter('ALL')}
                  className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                    complaintStatusFilter === 'ALL'
                      ? 'bg-[#00204a] text-white shadow-xs'
                      : 'text-[#747780] hover:text-[#000a1f]'
                  }`}
                >
                  All Grievances on Works
                </button>
              </div>

              <button
                onClick={fetchAgencyComplaints}
                disabled={complaintsLoading}
                className="btn-outline text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} className={complaintsLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {complaintsLoading ? (
            <div className="py-12 text-center text-[#747780]">
              <RefreshCw size={20} className="animate-spin text-[#00204a] mx-auto mb-2" />
              <p className="text-xs font-semibold">Checking for assigned grievance queries…</p>
            </div>
          ) : agencyComplaints.length === 0 ? (
            <div className="py-12 text-center text-[#747780] bg-[#F8F9FA] rounded border border-dashed border-[#CED4DA] space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
              <h3 className="text-sm font-bold text-[#000a1f]">
                {complaintStatusFilter === 'INFORMATION_REQUESTED'
                  ? 'No Pending Information Requests'
                  : 'No Citizen Grievances Found'}
              </h3>
              <p className="text-xs max-w-md mx-auto">
                {complaintStatusFilter === 'INFORMATION_REQUESTED'
                  ? 'No active citizen grievances are currently awaiting technical response or progress validation from your agency.'
                  : 'No citizen grievances are currently recorded for works assigned to your agency.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agencyComplaints.map((item) => (
                <div
                  key={item.complaintId}
                  className="p-4 rounded border border-[#CED4DA] bg-white hover:border-[#00204a] transition-all space-y-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F3F5] pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#005eb2] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.complaintId}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {item.category}
                      </span>
                      <span className="font-mono text-xs text-[#00204a] font-semibold">
                        Work ID: {item.workId}
                      </span>
                      {item.district && (
                        <span className="text-[11px] text-[#747780]">
                          · {item.district}, {item.state}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      INFORMATION REQUESTED
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#747780] block mb-0.5">Assigned Work Title:</span>
                    <p className="text-xs font-bold text-[#000a1f]">{item.workDescription}</p>
                  </div>

                  <div className="p-2.5 bg-amber-50/70 rounded border border-amber-200/80 text-xs text-amber-950 space-y-1">
                    <span className="font-bold text-[10px] uppercase text-amber-900 block">Complainant Concern:</span>
                    <p className="italic">"{item.description}"</p>
                  </div>

                  {item.publicResponse && (
                    <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200/70 text-xs text-blue-950 space-y-1">
                      <span className="font-bold text-[10px] uppercase text-blue-900 block">District Authority Inquiry / Directive:</span>
                      <p>{item.publicResponse}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => {
                        setSelectedAgencyComplaint(item);
                        setAgencyRemarksInput('');
                        setAgencyProgressInput(50);
                        setAgencyErrorMsg(null);
                        setAgencySuccessMsg(null);
                      }}
                      className="btn-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <TrendingUp size={13} />
                      <span>Submit Progress &amp; Explanation</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agency Response Modal */}
      {selectedAgencyComplaint && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-sm border border-[#E9ECEF] shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#00204a] uppercase tracking-wider bg-[#EEF2F6] px-2 py-0.5 rounded">
                  Implementing Agency Response
                </span>
                <h3 className="text-base font-bold text-[#000a1f] mt-1">
                  Submit Technical Explanation &amp; Progress
                </h3>
              </div>
              <button
                onClick={() => setSelectedAgencyComplaint(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#F8F9FA] p-3 rounded border border-[#E9ECEF] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#747780]">Complaint ID: <strong className="font-mono text-[#00204a]">{selectedAgencyComplaint.complaintId}</strong></span>
                <span className="text-[#747780]">Work ID: <strong className="font-mono text-[#0066CC]">{selectedAgencyComplaint.workId}</strong></span>
              </div>
              <p className="font-semibold text-[#000a1f]">{selectedAgencyComplaint.workDescription}</p>

              {/* Citizen & District Ground Evidence Viewer */}
              <div className="pt-1">
                <EvidenceMediaViewer
                  items={agencyComplaintEvidence}
                  title="Citizen & Prior Role Proofs"
                  emptyMessage="No media files attached to this grievance enquiry."
                  allowDownload={true}
                />
              </div>
            </div>

            {agencySuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{agencySuccessMsg}</span>
              </div>
            )}

            {agencyErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                <span>{agencyErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAgencyResponse} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#000a1f]">Current Physical Progress (%):</label>
                  <span className="font-mono font-bold text-[#00204a] text-sm">{agencyProgressInput}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={agencyProgressInput}
                  onChange={e => setAgencyProgressInput(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[#00204a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#000a1f] mb-1">
                  Technical Remarks &amp; Ground Execution Explanation: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={agencyRemarksInput}
                  onChange={e => setAgencyRemarksInput(e.target.value)}
                  placeholder="State the current milestone completed, reasons for any delay, schedule for next phase, or quality inspection certification details..."
                  className="w-full p-2.5 border border-[#CED4DA] rounded text-xs focus:outline-none focus:border-[#00204a]"
                  required
                />
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-[11px] text-blue-900">
                <strong>Administrative Protocol Notice:</strong> Submitting this response transitions the grievance status to <em>ACTION IN PROGRESS</em> and attaches your explanation to the case dossier. Final resolution and closure authority rests strictly with the District Officer.
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#E9ECEF] pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedAgencyComplaint(null)}
                  className="btn-outline text-xs py-1.5 px-3 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={agencySubmitting || !agencyRemarksInput.trim()}
                  className="btn-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {agencySubmitting ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Submitting to District Authority…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Submit Explanation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* EXECUTION WORKSPACE MODAL / DRAWER                                        */}
      {/* ========================================================================= */}
      {selectedWorkId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-sm border border-[#E9ECEF] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00204a] text-white font-mono">
                    {selectedWorkId}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedWorkHouse}
                  </span>
                  <span className="text-[10px] font-bold text-[#747780] bg-white px-2 py-0.5 rounded border border-[#CED4DA]">
                    Execution Workspace
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#000a1f] line-clamp-1" title={workspaceData?.project?.work_description}>
                  {workspaceData?.project?.work_description || 'Loading Work Details…'}
                </h3>
              </div>

              <button
                onClick={handleCloseWorkspace}
                className="text-slate-400 hover:text-slate-700 p-2 rounded text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Sub-Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-[#E9ECEF] px-5 bg-white">
              {[
                { id: 'info', label: 'Project Information', icon: Info },
                { id: 'submit-update', label: 'Submit Execution Update', icon: TrendingUp },
                { id: 'evidence', label: 'Evidence & Documents', icon: Paperclip },
                { id: 'feedback', label: 'Review Feedback', icon: CheckCircle2 },
                { id: 'history', label: 'Execution History', icon: History },
              ].map((subTab) => {
                const Icon = subTab.icon;
                const isActive = workspaceTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setWorkspaceTab(subTab.id as any)}
                    className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#00204a] text-[#00204a]'
                        : 'border-transparent text-[#747780] hover:text-[#000a1f]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{subTab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {workspaceLoading || !workspaceData ? (
                <div className="py-16 text-center text-[#747780]">
                  <RefreshCw size={24} className="animate-spin text-[#00204a] mx-auto mb-2" />
                  <p className="font-semibold text-xs">Loading execution workspace data…</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: PROJECT INFORMATION (READ-ONLY) */}
                  {workspaceTab === 'info' && (
                    <div className="space-y-5">
                      {/* Project Master Info Banner */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 rounded border border-[#E9ECEF] text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Work ID</span>
                          <span className="font-mono font-bold text-[#00204a] mt-0.5 block">{workspaceData.project.work_id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Recommended By MP</span>
                          <span className="font-semibold text-[#000a1f] mt-0.5 block">{workspaceData.project.mp_name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">State & District</span>
                          <span className="font-semibold text-[#000a1f] mt-0.5 block">{workspaceData.project.district}, {workspaceData.project.state}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Constituency</span>
                          <span className="font-semibold text-[#000a1f] mt-0.5 block">{workspaceData.project.constituency || 'General'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Sanctioned Amount</span>
                          <span className="font-mono font-bold text-[#000a1f] text-sm mt-0.5 block">
                            {formatCurrency(workspaceData.project.sanction_amount || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Disbursed / Paid</span>
                          <span className="font-mono font-semibold text-[#0066CC] mt-0.5 block">
                            {formatCurrency(workspaceData.project.amount_disbursed || workspaceData.project.total_paid || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Category</span>
                          <span className="font-medium text-[#000a1f] mt-0.5 block">{workspaceData.project.work_category || 'General Infrastructure'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider block">Financial Year</span>
                          <span className="font-mono text-[#000a1f] mt-0.5 block">{workspaceData.project.financial_year || '2024-2025'}</span>
                        </div>
                      </div>

                      {/* Current Execution State */}
                      <div className="card p-4 space-y-3">
                        <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider">Current Execution Progress</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-[#00204a] h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(5, formProgress))}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold font-mono text-[#00204a]">{formProgress}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#747780] pt-1">
                          <span>Status: <strong>{workspaceData.project.work_status || 'In Progress'}</strong></span>
                          <span>Last Ground Update: <strong>{workspaceData.executionUpdates?.[0]?.update_date || 'Dataset Record'}</strong></span>
                        </div>
                      </div>

                      {/* Read-Only Risk & Intelligence Section */}
                      <div className="card p-4 space-y-3 bg-slate-50/50 border border-[#CED4DA]">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert size={14} className="text-amber-600" /> Risk & Anomaly Intelligence (Read-Only)
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            Computed by Isolation Forest / Rule Engine
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-2.5 bg-white rounded border border-[#E9ECEF]">
                            <span className="text-[10px] font-bold text-[#747780] block uppercase">Risk Level</span>
                            <span className="font-bold text-sm mt-0.5 block text-[#000a1f]">
                              {workspaceData.project.risk_level || 'LOW'}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded border border-[#E9ECEF]">
                            <span className="text-[10px] font-bold text-[#747780] block uppercase">Risk Score</span>
                            <span className="font-bold font-mono text-sm mt-0.5 block text-[#000a1f]">
                              {workspaceData.project.risk_score ? Math.round(workspaceData.project.risk_score) : 15} / 100
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded border border-[#E9ECEF]">
                            <span className="text-[10px] font-bold text-[#747780] block uppercase">Verification Status</span>
                            <span className="font-bold text-xs mt-0.5 block text-[#0066CC]">
                              {workspaceData.project.verification_status || 'STANDARD_MONITORING'}
                            </span>
                          </div>
                        </div>

                        {/* Why Attention */}
                        <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900 space-y-1">
                          <strong>Why Attention?</strong>
                          <p>
                            {workspaceData.project.risk_explanation ||
                              (workspaceData.anomalyResults?.[0]?.anomaly_description) ||
                              'Routine project monitoring. Ensure milestone updates and measurement records are submitted every quarter.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SUBMIT EXECUTION UPDATE */}
                  {workspaceTab === 'submit-update' && (
                    <form onSubmit={(e) => handleSubmitUpdate(e, false)} className="space-y-4">
                      <div className="border-b border-[#E9ECEF] pb-2">
                        <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider">
                          Submit Append-Only Execution Progress
                        </h4>
                        <p className="text-[11px] text-[#747780]">
                          Submitting this update logs an immutable entry in the audit trail and advances the ground milestone status.
                        </p>
                      </div>

                      {formSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 size={16} /> {formSuccess}
                        </div>
                      )}
                      {formError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle size={16} /> {formError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Physical Progress */}
                        <div>
                          <label className="block font-bold text-[#000a1f] uppercase tracking-wider mb-1">
                            Physical Progress (%) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={formProgress}
                            onChange={(e) => setFormProgress(Number(e.target.value))}
                            className="w-full p-2 border border-[#CED4DA] rounded outline-none font-mono"
                          />
                        </div>

                        {/* Milestone Status */}
                        <div>
                          <label className="block font-bold text-[#000a1f] uppercase tracking-wider mb-1">
                            Milestone / Execution Status <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formMilestone}
                            onChange={(e) => setFormMilestone(e.target.value)}
                            className="w-full p-2 border border-[#CED4DA] rounded outline-none"
                          >
                            <option value="Active Physical Execution">Active Physical Execution</option>
                            <option value="Foundation & Structure Completed">Foundation & Structure Completed</option>
                            <option value="Mid-Stage Physical Inspection Scheduled">Mid-Stage Physical Inspection Scheduled</option>
                            <option value="Finishing & Fitting Stage">Finishing & Fitting Stage</option>
                            <option value="Physically Completed">Physically Completed (Awaiting Inspection)</option>
                            <option value="Work Completed & Handed Over">Work Completed & Handed Over</option>
                            <option value="Delayed Due to Site Conditions">Delayed Due to Site Conditions</option>
                          </select>
                        </div>

                        {/* Update Date */}
                        <div>
                          <label className="block font-bold text-[#000a1f] uppercase tracking-wider mb-1">
                            Measurement / Inspection Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            className="w-full p-2 border border-[#CED4DA] rounded outline-none font-mono"
                          />
                        </div>

                        {/* Expected Completion Date */}
                        <div>
                          <label className="block font-bold text-[#000a1f] uppercase tracking-wider mb-1">
                            Expected Completion Date
                          </label>
                          <input
                            type="date"
                            value={formExpectedDate}
                            onChange={(e) => setFormExpectedDate(e.target.value)}
                            className="w-full p-2 border border-[#CED4DA] rounded outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Execution Remarks */}
                      <div>
                        <label className="block text-xs font-bold text-[#000a1f] uppercase tracking-wider mb-1">
                          Execution Remarks & Contractor Details <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={formRemarks}
                          onChange={(e) => setFormRemarks(e.target.value)}
                          placeholder="Provide details of works executed, measurement book entry number, engineer remarks…"
                          className="w-full p-2.5 text-xs border border-[#CED4DA] rounded outline-none"
                        />
                      </div>

                      {/* Delay Reason */}
                      <div>
                        <label className="block text-xs font-bold text-[#000a1f] uppercase tracking-wider mb-1">
                          Reason for Delay (If Applicable)
                        </label>
                        <input
                          type="text"
                          value={formDelayReason}
                          onChange={(e) => setFormDelayReason(e.target.value)}
                          placeholder="E.g. Monsoons, land clearance, material availability…"
                          className="w-full p-2 text-xs border border-[#CED4DA] rounded outline-none"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9ECEF]">
                        <button
                          type="button"
                          disabled={formSubmitting}
                          onClick={(e) => handleSubmitUpdate(e, true)}
                          className="btn-outline text-xs py-2 px-4 font-bold"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5"
                        >
                          <Check size={14} /> Submit Execution Update
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 3: EVIDENCE & DOCUMENTS */}
                  {workspaceTab === 'evidence' && (
                    <div className="space-y-5">
                      <div className="border-b border-[#E9ECEF] pb-2 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider">
                            Supporting Execution Evidence
                          </h4>
                          <p className="text-[11px] text-[#747780]">
                            Attached site photos, measurement book records, and inspection certificates.
                          </p>
                        </div>
                      </div>

                      {evidenceSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 size={16} /> {evidenceSuccess}
                        </div>
                      )}
                      {evidenceError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle size={16} /> {evidenceError}
                        </div>
                      )}

                      {/* Upload Form */}
                      <form onSubmit={handleAttachEvidence} className="p-4 bg-[#F8F9FA] rounded border border-[#CED4DA] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#00204a] uppercase tracking-wider block">
                            Attach New Supporting Proof (Any Format)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Max 25MB · Photos, Videos, Audio, PDFs, Docs, Archives
                          </span>
                        </div>

                        {/* File Picker */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#000a1f]">
                            Select Media / Document File:
                          </label>
                          <input
                            type="file"
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setSelectedEvidenceFile(file);
                              if (file && !evidenceFileName) {
                                setEvidenceFileName(file.name);
                              }
                            }}
                            className="w-full px-3 py-2 text-xs border border-[#CED4DA] rounded bg-white file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#00204a] file:text-white hover:file:bg-[#003366] cursor-pointer"
                          />
                          {selectedEvidenceFile && (
                            <p className="text-[11px] text-emerald-700 font-medium">
                              Selected: {selectedEvidenceFile.name} ({(selectedEvidenceFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-bold text-[#000a1f] mb-1">Document / Photo Title *</label>
                            <input
                              type="text"
                              required
                              placeholder="E.g., Site Progress Photograph - Stage 2"
                              value={evidenceFileName}
                              onChange={(e) => setEvidenceFileName(e.target.value)}
                              className="w-full p-2 bg-white border border-[#CED4DA] rounded outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[#000a1f] mb-1">Evidence Type</label>
                            <select
                              value={evidenceType}
                              onChange={(e) => setEvidenceType(e.target.value)}
                              className="w-full p-2 bg-white border border-[#CED4DA] rounded outline-none"
                            >
                              <option value="Site Progress Photograph">Site Progress Photograph (Geo-Tagged)</option>
                              <option value="Site Inspection Video">Site Drone / Progress Inspection Video</option>
                              <option value="Audio Voice Recording">Field Engineer Audio Memo / Sound Measurement</option>
                              <option value="Measurement Book Copy">Measurement Book (MB) Entry Copy</option>
                              <option value="Stage Completion Certificate">Stage Completion Certificate</option>
                              <option value="Quality Inspection Certificate">Quality & Material Test Certificate</option>
                              <option value="Handover Document">Handover / Utilization Certificate</option>
                              <option value="Archive / CAD Drawing">Engineering Drawings / Zip Archive</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#000a1f] mb-1">Description / Location Notes</label>
                          <input
                            type="text"
                            placeholder="Briefly describe what this photo or document certifies…"
                            value={evidenceDesc}
                            onChange={(e) => setEvidenceDesc(e.target.value)}
                            className="w-full p-2 text-xs bg-white border border-[#CED4DA] rounded outline-none"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={evidenceSubmitting}
                            className="btn-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Upload size={13} /> Record Evidence Entry
                          </button>
                        </div>
                      </form>

                      {/* Evidence List via Universal Viewer */}
                      <div className="space-y-2 pt-2">
                        <EvidenceMediaViewer
                          items={(workspaceData.evidence || []).map((item: ExecutionEvidence) => ({
                            id: item.id,
                            fileName: item.file_name,
                            fileType: item.file_type || 'application/octet-stream',
                            fileSize: item.file_size_bytes || 0,
                            storagePath: item.storage_path || '',
                            description: item.description || '',
                            uploadedBy: item.uploaded_by || agencyName,
                            uploaderRole: 'Implementing Agency',
                            createdAt: item.created_at,
                          }))}
                          title={`Attached Evidence Dossier (${workspaceData.evidence?.length || 0})`}
                          emptyMessage="No supporting ground proof documents attached yet for this project."
                          allowDownload={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: REVIEW FEEDBACK */}
                  {workspaceTab === 'feedback' && (
                    <div className="space-y-4">
                      <div className="border-b border-[#E9ECEF] pb-2">
                        <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider">
                          Reviewer & Auditor Feedback
                        </h4>
                        <p className="text-[11px] text-[#747780]">
                          Official feedback and revision remarks from District Verification Officers or MoSPI Auditors.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {workspaceData.executionUpdates?.length === 0 ? (
                          <div className="p-6 text-center text-[#747780] bg-slate-50 rounded border border-[#E9ECEF]">
                            No review feedback submitted yet.
                          </div>
                        ) : (
                          workspaceData.executionUpdates.map((u: ExecutionUpdate) => (
                            <div
                              key={u.id}
                              className="p-4 rounded border border-[#E9ECEF] bg-white space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#00204a]">
                                  Milestone: {u.milestone_status} ({u.physical_progress}%)
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.review_status === 'ACCEPTED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : u.review_status === 'NEEDS REVISION'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {u.review_status}
                                </span>
                              </div>

                              <p className="text-[#44474f] bg-[#F8F9FA] p-2.5 rounded border border-[#E9ECEF]">
                                <strong>Agency Submission Remarks:</strong> {u.remarks}
                              </p>

                              {u.reviewer_remarks ? (
                                <div className="p-2.5 bg-purple-50 rounded border border-purple-200 text-purple-900">
                                  <strong>Reviewer Remarks:</strong> {u.reviewer_remarks}
                                </div>
                              ) : (
                                <div className="text-[11px] text-[#747780] italic">
                                  Pending verification desk assessment.
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: EXECUTION HISTORY (AUDIT TIMELINE) */}
                  {workspaceTab === 'history' && (
                    <div className="space-y-4">
                      <div className="border-b border-[#E9ECEF] pb-2">
                        <h4 className="text-xs font-bold text-[#000a1f] uppercase tracking-wider">
                          Execution Audit Trail & Event Timeline
                        </h4>
                        <p className="text-[11px] text-[#747780]">
                          Chronological timeline reusing the platform immutable audit ledger.
                        </p>
                      </div>

                      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {workspaceData.auditTrail?.length === 0 ? (
                          <div className="p-6 text-center text-[#747780] bg-slate-50 rounded border border-[#E9ECEF]">
                            No audit trail events recorded yet for this work.
                          </div>
                        ) : (
                          workspaceData.auditTrail.map((event: any, idx: number) => (
                            <div key={event.id || idx} className="relative pl-8 text-xs space-y-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#00204a] absolute left-2.5 top-1 ring-4 ring-white" />
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#000a1f]">
                                  {event.action?.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono text-[#747780]">
                                  {new Date(event.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-[#555]">
                                Actor: <strong>{event.actor_name}</strong> ({event.actor_role})
                              </div>
                              {event.comment && (
                                <p className="text-[#44474f] bg-[#F8F9FA] p-2 rounded border border-[#E9ECEF]">
                                  {event.comment}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E9ECEF] bg-[#F8F9FA] flex justify-end">
              <button
                onClick={handleCloseWorkspace}
                className="btn-outline text-xs py-1.5 px-4 font-bold"
              >
                Close Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
