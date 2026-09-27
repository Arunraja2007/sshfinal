

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/store';
import {
  MapPin, AlertTriangle, CheckCircle2, TrendingUp,
  Layers, ShieldCheck, ArrowUpRight, RotateCw,
  Search, Building2, User, ChevronRight, AlertCircle,
  ExternalLink, FileText, CheckCircle, ArrowLeftRight
} from 'lucide-react';
import { formatCurrency } from '../../utils';
import { getStateNodalOverview, type StateNodalOverview } from '../../services/projectService';
import { getAnalyticsObservatory } from '../../services/analyticsService';
import { CategoryRiskDistribution, type WorkCategoryRiskItem } from '../../components/CategoryRiskDistribution';
import { PublicService } from '../../services/publicService';
import type { StateEscalatedComplaintItem, EvidenceMediaItem } from '../../types/public';
import { EvidenceMediaViewer } from '../../components/EvidenceMediaViewer';
import { ComparativeIntelligence } from '../../components/ComparativeIntelligence';
import { MpAvatar } from '../../components/MpAvatar';


export function StateNodalDashboard() {
  const { profile, user } = useAuthStore();
  const { setCurrentPage, selectProject, setFilters, setActiveHouse } = useAppStore();

  const assignedState = profile?.state || 'Tamil Nadu';
  const officerName = profile?.full_name || 'State Nodal Officer';
  const officerEmail = user?.email || (profile as any)?.email || '';

  const [house, setHouse] = useState<'Lok Sabha' | 'Rajya Sabha'>('Lok Sabha');
  const [overview, setOverview] = useState<StateNodalOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [districtSearch, setDistrictSearch] = useState<string>('');
  const [repSearch, setRepSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'comparative' | 'escalated-grievances'>('overview');
  const [compareDistrictA, setCompareDistrictA] = useState<string>('');
  const [compareDistrictB, setCompareDistrictB] = useState<string>('');

  // Category Risk Distribution State
  const [categoryData, setCategoryData] = useState<WorkCategoryRiskItem[]>([]);
  const [categoryLoading, setCategoryLoading] = useState<boolean>(false);

  // Escalated Grievances State
  const [escalatedComplaints, setEscalatedComplaints] = useState<StateEscalatedComplaintItem[]>([]);
  const [escalatedLoading, setEscalatedLoading] = useState<boolean>(false);
  const [selectedEscalatedComplaint, setSelectedEscalatedComplaint] = useState<StateEscalatedComplaintItem | null>(null);
  const [escalatedEvidence, setEscalatedEvidence] = useState<EvidenceMediaItem[]>([]);
  const [stateDirectionInput, setStateDirectionInput] = useState<string>('');
  const [stateSubmitting, setStateSubmitting] = useState<boolean>(false);
  const [stateSuccessMsg, setStateSuccessMsg] = useState<string | null>(null);
  const [stateErrorMsg, setStateErrorMsg] = useState<string | null>(null);

  const fetchEscalatedComplaints = useCallback(async () => {
    setEscalatedLoading(true);
    try {
      const list = await PublicService.getStateEscalatedComplaints(assignedState);
      setEscalatedComplaints(list);
    } catch (err) {
      console.warn('Failed to load state escalated complaints:', err);
    } finally {
      setEscalatedLoading(false);
    }
  }, [assignedState]);

  useEffect(() => {
    if (selectedEscalatedComplaint) {
      PublicService.getEvidence(selectedEscalatedComplaint.complaintId)
        .then((evList) => setEscalatedEvidence(evList || []))
        .catch(() => setEscalatedEvidence([]));
    } else {
      setEscalatedEvidence([]);
    }
  }, [selectedEscalatedComplaint]);

  useEffect(() => {
    fetchEscalatedComplaints();
  }, [fetchEscalatedComplaints]);

  const handleSubmitStateDirection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalatedComplaint) return;
    if (!stateDirectionInput.trim()) {
      setStateErrorMsg('Please enter state administrative instructions and guidance.');
      return;
    }

    setStateSubmitting(true);
    setStateErrorMsg(null);
    setStateSuccessMsg(null);

    try {
      await PublicService.submitStateNodalDirection(selectedEscalatedComplaint.complaintId, {
        direction: stateDirectionInput.trim(),
        officerName,
      });
      setStateSuccessMsg('State administrative direction issued and attached to case dossier for District Officer execution.');
      setStateDirectionInput('');
      fetchEscalatedComplaints();
      setTimeout(() => {
        setSelectedEscalatedComplaint(null);
        setStateSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setStateErrorMsg(err.message || 'Failed to submit direction.');
    } finally {
      setStateSubmitting(false);
    }
  };


  const loadData = async (targetHouse: 'Lok Sabha' | 'Rajya Sabha') => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStateNodalOverview(targetHouse, assignedState);
      setOverview(data);
    } catch (err: any) {
      console.error('Error fetching state nodal overview:', err);
      setError(err?.message || 'Failed to load state nodal dashboard data');
    } finally {
      setLoading(false);
    }

    setCategoryLoading(true);
    try {
      const obs = await getAnalyticsObservatory(targetHouse, { state: assignedState });
      if (obs && Array.isArray(obs.categoryRisk)) {
        setCategoryData(obs.categoryRisk);
      }
    } catch (catErr) {
      console.warn('Error fetching state category risk:', catErr);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    loadData(house);
  }, [house, assignedState]);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    if (!overview?.districts) return [];
    if (!districtSearch.trim()) return overview.districts;
    const q = districtSearch.toLowerCase();
    return overview.districts.filter(d => d.district.toLowerCase().includes(q));
  }, [overview?.districts, districtSearch]);

  // Filtered constituencies / MPs
  const filteredConstituencies = useMemo(() => {
    if (!overview?.constituencies) return [];
    if (!repSearch.trim()) return overview.constituencies;
    const q = repSearch.toLowerCase();
    return overview.constituencies.filter(
      c => c.constituency.toLowerCase().includes(q) || c.mp_name.toLowerCase().includes(q)
    );
  }, [overview?.constituencies, repSearch]);

  const filteredMps = useMemo(() => {
    if (!overview?.mps) return [];
    if (!repSearch.trim()) return overview.mps;
    const q = repSearch.toLowerCase();
    return overview.mps.filter(m => m.mp_name.toLowerCase().includes(q));
  }, [overview?.mps, repSearch]);

  const kpis = overview?.kpis || {
    total: 0,
    totalSanctionAmount: 0,
    totalDisbursed: 0,
    completed: 0,
    highRisk: 0,
    medRisk: 0,
    lowRisk: 0,
    requiresVerification: 0,
    avgRiskScore: 0,
  };

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;
  const disbursementRate = kpis.totalSanctionAmount > 0
    ? Math.round((kpis.totalDisbursed / kpis.totalSanctionAmount) * 100)
    : 0;

  // Drilldown helper
  const handleDrilldownDistrict = (districtName: string) => {
    setActiveHouse(house);
    setFilters({
      state: assignedState,
      district: districtName,
      constituency: '',
      mpName: '',
      riskLevel: '',
      status: '',
      category: '',
      search: '',
    });
    setCurrentPage('monitoring');
  };

  // Compare district helper
  const handleCompareDistrict = (districtName: string) => {
    setCompareDistrictA(districtName);
    const other = overview?.districts.find(d => d.district !== districtName)?.district || '';
    setCompareDistrictB(other);
    setViewMode('comparative');
  };

  const handleDrilldownConstituency = (constName: string, mpName?: string) => {
    setActiveHouse('Lok Sabha');
    setFilters({
      state: assignedState,
      district: '',
      constituency: constName,
      mpName: mpName || '',
      riskLevel: '',
      status: '',
      category: '',
      search: '',
    });
    setCurrentPage('monitoring');
  };

  const handleDrilldownMp = (mpName: string) => {
    setActiveHouse(house);
    setFilters({
      state: assignedState,
      district: '',
      constituency: '',
      mpName,
      riskLevel: '',
      status: '',
      category: '',
      search: '',
    });
    setCurrentPage('monitoring');
  };

  const handleOpenProject = (workId: string) => {
    setActiveHouse(house);
    selectProject(workId);
    setFilters({
      state: assignedState,
      search: workId,
    });
    setCurrentPage('monitoring');
    window.history.pushState({}, '', '/monitoring');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── State Header Banner ── */}
      <div className="bg-white border border-[#D5DCE4] rounded-lg p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-[#EEF2F6] text-[#00204a] border border-[#D5DCE4]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STATE MPLADS MONITORING
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-[#0066CC] border border-blue-200">
                <span>🔒 State Jurisdiction:</span>
                <span className="font-extrabold">{assignedState}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                (Non-transferable Jurisdiction)
              </span>
            </div>

            <h1 className="text-2xl font-bold text-[#000a1f] mt-2 font-['Montserrat',sans-serif]">
              {assignedState} — State Nodal Desk
            </h1>

            <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
              <span>Nodal Officer: <strong className="text-slate-800">{officerName}</strong></span>
              {officerEmail && <span>· <span className="font-mono text-slate-500">{officerEmail}</span></span>}
              <span>· Monitoring physical execution, financial disbursements, and AI risk signals.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode(viewMode === 'comparative' ? 'overview' : 'comparative')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'comparative'
                  ? 'bg-[#E67E22] text-white hover:bg-[#D35400]'
                  : 'bg-white text-[#00204a] border border-[#00204a] hover:bg-slate-50'
              }`}
              title="Compare performance between districts within the state"
            >
              <ArrowLeftRight size={14} />
              <span>{viewMode === 'comparative' ? 'State Overview' : 'Compare Intelligence'}</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'escalated-grievances' ? 'overview' : 'escalated-grievances')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'escalated-grievances'
                  ? 'bg-purple-700 text-white hover:bg-purple-800'
                  : 'bg-white text-purple-900 border border-purple-300 hover:bg-purple-50'
              }`}
              title="Review escalated citizen grievances and issue state directions"
            >
              <AlertCircle size={14} />
              <span>Escalated Grievances ({escalatedComplaints.length})</span>
            </button>

            <button
              onClick={() => loadData(house)}

              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh State Data"
            >
              <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => {
                setActiveHouse(house);
                setFilters({ state: assignedState });
                setCurrentPage('monitoring');
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#00204a] hover:bg-[#001737] rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers size={14} />
              Project Intelligence
            </button>

            <button
              onClick={() => {
                setActiveHouse(house);
                setFilters({ state: assignedState });
                setCurrentPage('gis');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MapPin size={14} className="text-blue-600" />
              State GIS
            </button>

            <button
              onClick={() => {
                setActiveHouse(house);
                setFilters({ state: assignedState });
                setCurrentPage('verification');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck size={14} className="text-emerald-600" />
              Verification Desk
            </button>
          </div>
        </div>

        {/* ── House Switcher Buttons ── */}
        <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Select House:
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setHouse('Lok Sabha')}
                className={`px-5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  house === 'Lok Sabha'
                    ? 'bg-[#00204a] text-white shadow-sm'
                    : 'text-slate-700 hover:text-[#00204a]'
                }`}
              >
                LOK SABHA
              </button>
              <button
                type="button"
                onClick={() => setHouse('Rajya Sabha')}
                className={`px-5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  house === 'Rajya Sabha'
                    ? 'bg-[#00204a] text-white shadow-sm'
                    : 'text-slate-700 hover:text-[#00204a]'
                }`}
              >
                RAJYA SABHA
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Active view: <span className="font-bold text-slate-800">{house}</span> projects in <span className="font-bold text-slate-800">{assignedState}</span>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData(house)}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && !overview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse border border-slate-200" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse border border-slate-200" />
        </div>
      )}

      {/* ── State Overview / Comparative Content ── */}
      {viewMode === 'comparative' ? (
        <ComparativeIntelligence
          activeHouse={house}
          lockedState={assignedState}
          initialMode="district"
          allowedModes={['district', 'category', 'fy', 'house']}
          preselectedA={compareDistrictA}
          preselectedB={compareDistrictB}
          title={`${assignedState} — District Comparative Intelligence`}
          subtitle={`Compare MPLADS execution, expenditure velocity, and risk parameters between districts within ${assignedState}.`}
          onBackToOverview={() => setViewMode('overview')}
        />
      ) : viewMode === 'escalated-grievances' ? (
        <div className="bg-white border border-[#D5DCE4] rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9ECEF] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
                <AlertCircle size={15} />
                <span>State Nodal Escalation Authority</span>
              </div>
              <h2 className="text-xl font-bold text-[#000a1f] mt-1 font-['Montserrat',sans-serif]">
                Escalated Citizen Grievances &amp; Appeals
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Reviewing grievances escalated by District Authorities in {assignedState} for administrative direction and inter-departmental guidance.
              </p>
            </div>
            <button
              onClick={fetchEscalatedComplaints}
              disabled={escalatedLoading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              <RotateCw size={12} className={escalatedLoading ? 'animate-spin' : ''} />
              <span>Refresh Escalations</span>
            </button>
          </div>

          {escalatedLoading ? (
            <div className="py-12 text-center text-slate-500">
              <RotateCw size={22} className="animate-spin text-[#00204a] mx-auto mb-2" />
              <p className="text-xs font-semibold">Retrieving escalated complaints from database…</p>
            </div>
          ) : escalatedComplaints.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-[#F8F9FA] rounded-lg border border-dashed border-[#CED4DA] space-y-2">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-[#000a1f]">No Pending Escalated Grievances</h3>
              <p className="text-xs max-w-md mx-auto">
                No citizen grievances in {assignedState} are currently awaiting state nodal review or policy direction.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {escalatedComplaints.map((item) => (
                <div
                  key={item.complaintId}
                  className="p-4 rounded-lg border border-[#CED4DA] bg-white hover:border-purple-600 transition-all shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F3F5] pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {item.complaintId}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {item.category}
                      </span>
                      <button
                        onClick={() => handleOpenProject(item.workId)}
                        className="text-xs font-mono font-semibold text-[#0066CC] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Inspect in Project Intelligence"
                      >
                        <span>Work ID: {item.workId}</span>
                        <ExternalLink size={11} />
                      </button>

                      {item.district && (
                        <span className="text-[11px] text-slate-500">
                          · District: <strong>{item.district}</strong>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 uppercase">
                      ESCALATED TO STATE
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Sanctioned Work Description:</span>
                    <p className="text-xs font-bold text-[#000a1f]">{item.workDescription}</p>
                  </div>

                  <div className="p-2.5 bg-amber-50/70 rounded border border-amber-200 text-xs text-amber-950 space-y-1">
                    <span className="font-bold text-[10px] uppercase text-amber-900 block">Citizen Allegation:</span>
                    <p className="italic">"{item.description}"</p>
                  </div>

                  {item.publicResponse && (
                    <div className="p-2.5 bg-purple-50/70 rounded border border-purple-200 text-xs text-purple-950 space-y-1">
                      <span className="font-bold text-[10px] uppercase text-purple-900 block">District Authority Escalation Reason:</span>
                      <p>{item.publicResponse}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => {
                        setSelectedEscalatedComplaint(item);
                        setStateDirectionInput('');
                        setStateErrorMsg(null);
                        setStateSuccessMsg(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck size={14} />
                      <span>Issue State Administrative Direction</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : overview && (

        <>
          {/* State KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Works */}
            <div className="bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total {house} Works
                </span>
                <Layers size={16} className="text-[#00204a]" />
              </div>
              <div className="text-2xl font-extrabold text-[#000a1f] mt-2 font-mono">
                {kpis.total.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700 mt-2 font-semibold flex items-center gap-1">
                <CheckCircle size={13} />
                <span>{kpis.completed.toLocaleString('en-IN')} Completed ({completionRate}%)</span>
              </div>
            </div>

            {/* Sanctions & Disbursements */}
            <div className="bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Sanctions
                </span>
                <TrendingUp size={16} className="text-[#0066CC]" />
              </div>
              <div className="text-2xl font-extrabold text-[#000a1f] mt-2 font-mono">
                {formatCurrency(kpis.totalSanctionAmount)}
              </div>
              <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-between">
                <span>Disbursed: <strong className="text-slate-800">{formatCurrency(kpis.totalDisbursed)}</strong></span>
                <span className="font-bold text-blue-700">{disbursementRate}%</span>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  High Risk Projects
                </span>
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div className="text-2xl font-extrabold text-red-600 mt-2 font-mono">
                {kpis.highRisk.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-600 mt-2 flex items-center gap-3">
                <span className="text-amber-700 font-medium">Medium: {kpis.medRisk}</span>
                <span className="text-emerald-700 font-medium">Low: {kpis.lowRisk}</span>
              </div>
            </div>

            {/* Verification & Risk Score */}
            <div className="bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Verification Queue
                </span>
                <ShieldCheck size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-2 font-mono">
                {kpis.requiresVerification.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-between">
                <span>Avg State Risk:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  kpis.avgRiskScore >= 70 ? 'bg-red-100 text-red-800' :
                  kpis.avgRiskScore >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {kpis.avgRiskScore} / 100
                </span>
              </div>
            </div>
          </div>

          {/* ── District Breakdown & Priority Queue Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* District Breakdown Table (7 cols on lg) */}
            <div className="lg:col-span-7 bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={16} className="text-[#00204a]" />
                    District-Wise Project Concentration
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Administrative districts in {assignedState} ({overview.districts.length} active)
                  </p>
                </div>
                
                {/* Search in district table */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search district..."
                    value={districtSearch}
                    onChange={e => setDistrictSearch(e.target.value)}
                    className="w-44 px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <Search size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-2 text-right">Works</th>
                      <th className="py-2.5 px-2 text-right">Sanctioned</th>
                      <th className="py-2.5 px-2 text-right">Disbursed</th>
                      <th className="py-2.5 px-2 text-right">High Risk</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDistricts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No district records match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredDistricts.map((d, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {d.district}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-900">
                            {d.total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                            {formatCurrency(d.sanctioned)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                            {formatCurrency(d.disbursed)}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {d.high_risk > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                {d.high_risk}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDrilldownDistrict(d.district)}
                                className="px-2 py-1 bg-slate-100 hover:bg-[#00204a] hover:text-white text-slate-700 rounded text-[10px] font-bold transition-all flex items-center gap-0.5"
                                title={`Inspect ${d.district} projects in Project Intelligence`}
                              >
                                <span>View</span>
                                <ChevronRight size={11} />
                              </button>
                              <button
                                onClick={() => handleCompareDistrict(d.district)}
                                className="px-2 py-1 bg-orange-50 hover:bg-[#E67E22] hover:text-white text-[#E67E22] border border-orange-200 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                                title={`Compare ${d.district} with another district`}
                              >
                                <ArrowLeftRight size={10} />
                                <span>Compare</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* High-Risk Priority Queue (5 cols on lg) */}
            <div className="lg:col-span-5 bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    Priority Risk Queue
                  </h3>
                  <p className="text-[11px] text-slate-500">Highest risk projects requiring supervisory scrutiny</p>
                </div>
                <button
                  onClick={() => {
                    setActiveHouse(house);
                    setFilters({ state: assignedState, riskLevel: 'HIGH' });
                    setCurrentPage('anomalies');
                  }}
                  className="text-xs text-[#0066CC] font-bold hover:underline flex items-center gap-0.5"
                >
                  <span>All Alerts</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {overview.priorityQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No high-risk priority cases detected in {assignedState}.
                  </div>
                ) : (
                  overview.priorityQueue.map((p, i) => (
                    <div
                      key={i}
                      onClick={() => handleOpenProject(p.work_id)}
                      className="p-3 border border-slate-200 rounded-lg hover:border-[#00204a] hover:bg-slate-50 cursor-pointer transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#00204a] group-hover:text-blue-700">
                          {p.work_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.risk_level === 'HIGH' ? 'bg-red-100 text-red-800 border border-red-200' :
                          p.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          Risk: {p.risk_score} / 100
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-900 line-clamp-2 leading-snug">
                        {p.work_description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className="truncate max-w-[200px]" title={p.district}>
                          District: <strong className="text-slate-700">{p.district}</strong>
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(p.sanction_amount || 0)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Representation Breakdown (Constituencies / MPs) ── */}
          <div className="bg-white border border-[#D5DCE4] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#000a1f] uppercase tracking-wider flex items-center gap-2">
                  <User size={16} className="text-[#00204a]" />
                  {house === 'Lok Sabha' ? 'Parliamentary Constituency Breakdown' : 'Rajya Sabha Member Representation'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {house === 'Lok Sabha'
                    ? `Lok Sabha constituencies and elected MPs in ${assignedState}`
                    : `Rajya Sabha MPs and assigned works in ${assignedState}`}
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={house === 'Lok Sabha' ? 'Search constituency or MP...' : 'Search MP name...'}
                  value={repSearch}
                  onChange={e => setRepSearch(e.target.value)}
                  className="w-56 px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
                <Search size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {house === 'Lok Sabha' ? (
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Parliamentary Constituency</th>
                      <th className="py-2.5 px-3">Member of Parliament (MP)</th>
                      <th className="py-2.5 px-2 text-right">Works</th>
                      <th className="py-2.5 px-2 text-right">Sanctioned Amount</th>
                      <th className="py-2.5 px-2 text-right">High Risk</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredConstituencies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No parliamentary constituencies found matching your query.
                        </td>
                      </tr>
                    ) : (
                      filteredConstituencies.map((c, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {c.constituency}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <MpAvatar name={c.mp_name} size="xs" showName />
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {c.total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                            {formatCurrency(c.sanctioned)}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {c.high_risk > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                {c.high_risk}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDrilldownConstituency(c.constituency, c.mp_name)}
                              className="px-2 py-1 bg-slate-100 hover:bg-[#00204a] hover:text-white text-slate-700 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 mx-auto"
                            >
                              <span>View Works</span>
                              <ChevronRight size={11} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Member of Rajya Sabha (MP)</th>
                      <th className="py-2.5 px-2 text-right">Assigned Works</th>
                      <th className="py-2.5 px-2 text-right">Sanctioned Amount</th>
                      <th className="py-2.5 px-2 text-right">Disbursed Amount</th>
                      <th className="py-2.5 px-2 text-right">High Risk</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No Rajya Sabha MPs found for {assignedState}.
                        </td>
                      </tr>
                    ) : (
                      filteredMps.map((m, i) => (
                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <MpAvatar name={m.mp_name} size="sm" showName />
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                            {m.total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                            {formatCurrency(m.sanctioned)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                            {formatCurrency(m.disbursed)}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {m.high_risk > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                {m.high_risk}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDrilldownMp(m.mp_name)}
                              className="px-2 py-1 bg-slate-100 hover:bg-[#00204a] hover:text-white text-slate-700 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 mx-auto"
                            >
                              <span>View Works</span>
                              <ChevronRight size={11} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── State Work Category Risk Score Analysis ── */}
          <CategoryRiskDistribution
            data={categoryData}
            loading={categoryLoading}
            title={`Risk Score by Work Category — ${assignedState}`}
            subtitle={`Sectoral risk score benchmarking (0–100 scale) and vulnerability diagnostics across ${assignedState}.`}
            scopeLabel={`State: ${assignedState}`}
            onSelectCategory={(cat) => {
              setActiveHouse(house);
              setFilters({
                state: assignedState,
                category: cat,
              });
              setCurrentPage('monitoring');
            }}
          />
        </>
      )}

      {/* ── State Direction Modal ── */}
      {selectedEscalatedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-[#D5DCE4] shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9ECEF] pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                  State Nodal Administrative Desk
                </span>
                <h3 className="text-base font-bold text-[#000a1f] mt-1 font-['Montserrat',sans-serif]">
                  Issue State Nodal Administrative Directive
                </h3>
              </div>
              <button
                onClick={() => setSelectedEscalatedComplaint(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#F8F9FA] p-3 rounded border border-[#E9ECEF] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Complaint: <strong className="font-mono text-purple-800">{selectedEscalatedComplaint.complaintId}</strong></span>
                <span className="text-slate-500">Work ID: <strong className="font-mono text-[#0066CC]">{selectedEscalatedComplaint.workId}</strong></span>
              </div>
              <p className="font-semibold text-[#000a1f]">{selectedEscalatedComplaint.workDescription}</p>
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-950 text-[11px]">
                <strong>Citizen Allegation:</strong> "{selectedEscalatedComplaint.description}"
              </div>

              {/* Multi-Format Proof / Evidence Viewer */}
              <div className="pt-1">
                <EvidenceMediaViewer
                  items={escalatedEvidence}
                  title="Evidence Dossier & Field Proofs"
                  emptyMessage="No media files attached to this escalated complaint."
                  allowDownload={true}
                />
              </div>
            </div>

            {stateSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{stateSuccessMsg}</span>
              </div>
            )}

            {stateErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <span>{stateErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStateDirection} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#000a1f] mb-1">
                  Official Administrative Directive &amp; Instructions: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={stateDirectionInput}
                  onChange={e => setStateDirectionInput(e.target.value)}
                  placeholder="Record binding administrative guidance: inter-departmental clearances, technical sanction reviews, financial adjustments, or field inspection protocols..."
                  className="w-full p-2.5 border border-[#CED4DA] rounded text-xs focus:outline-none focus:border-purple-700"
                  required
                />
              </div>

              <div className="p-2.5 bg-purple-50/70 rounded border border-purple-200 text-[11px] text-purple-900">
                <strong>Governance Rule:</strong> State Nodal Directions provide official policy guidance. Dispatched instructions transition the case to <em>ACTION IN PROGRESS</em> and route the case back to the assigned District Officer for resolution.
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#E9ECEF] pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedEscalatedComplaint(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stateSubmitting || !stateDirectionInput.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {stateSubmitting ? (
                    <>
                      <RotateCw size={12} className="animate-spin" />
                      <span>Dispatching Directive…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Dispatch State Direction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

