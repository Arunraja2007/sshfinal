import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/store';
import { 
  UserCheck, AlertTriangle, CheckCircle2, Clock, DollarSign, 
  FileText, ShieldAlert, ArrowUpRight, Search, Landmark, 
  Award, User, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Camera, Edit3, Flag
} from 'lucide-react';
import { formatCurrency } from '../../utils';
import { MpService } from '../../services/mpService';
import type { MpDashboardMetrics } from '../../types/mp';
import type { EnrichedProject } from '../../types';
import { MpAvatar } from '../../components/MpAvatar';
import { getMpParty, getPartyInfo } from '../../services/mpPartyService';
import { EditMpProfileModal } from '../../components/EditMpProfileModal';

export function MpDashboard() {
  const { profile } = useAuthStore();
  const { setCurrentPage, selectProject } = useAppStore();

  const mpName = profile?.mp_name || profile?.full_name || 'Hon\'ble Member of Parliament';
  const house = profile?.house || 'Lok Sabha';
  const constituency = profile?.constituency || profile?.district || 'Constituency';
  const state = profile?.state || 'State';

  const [metrics, setMetrics] = useState<MpDashboardMetrics | null>(null);
  const [attentionWorks, setAttentionWorks] = useState<EnrichedProject[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mpParty, setMpPartyState] = useState(() => getMpParty(profile?.mp_name || profile?.id || profile?.full_name));

  // Projects table state
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [tabFilter, setTabFilter] = useState<'all' | 'attention' | 'ongoing' | 'completed'>('all');

  useEffect(() => {
    const handlePartyUpdated = () => {
      setMpPartyState(getMpParty(profile?.mp_name || profile?.id || profile?.full_name));
    };
    window.addEventListener('mp-party-updated', handlePartyUpdated);
    return () => window.removeEventListener('mp-party-updated', handlePartyUpdated);
  }, [profile]);

  const partyInfo = getPartyInfo(mpParty);

  const navigateTo = (path: string, pageId?: string) => {
    if (pageId) {
      setCurrentPage(pageId);
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // 1. Fetch MP Dashboard Overview Metrics
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await MpService.getDashboard();
      setMetrics(res.metrics);
      setAttentionWorks(res.attentionWorks || []);
    } catch (err) {
      console.error('Error fetching MP dashboard data:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // 2. Fetch Scoped Projects for MP
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const effectiveRisk = tabFilter === 'attention' ? 'HIGH' : (riskFilter !== 'ALL' ? riskFilter : undefined);
      const effectiveStatus = tabFilter === 'completed' 
        ? 'Work Completed' 
        : (tabFilter === 'ongoing' ? 'Work In Progress' : (statusFilter !== 'ALL' ? statusFilter : undefined));

      const res = await MpService.getProjects({
        page,
        pageSize,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: effectiveStatus,
        riskLevel: effectiveRisk,
        search: search ? search.trim() : undefined,
        sortBy: 'sanction_amount',
        sortOrder: 'desc',
      });

      setProjects(res.projects || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error('Error fetching MP project list:', err);
    } finally {
      setProjectsLoading(false);
    }
  }, [page, pageSize, categoryFilter, statusFilter, riskFilter, tabFilter, search]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6 pb-14 max-w-7xl mx-auto">
      {/* Hon'ble MP Dignitary Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061e38] via-[#09294f] to-[#041527] p-6 md:p-8 border border-slate-800 shadow-2xl text-white">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-10 flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border-b border-x border-emerald-500/30 rounded-b-lg text-xs font-semibold tracking-wider uppercase">
          <Award className="w-3.5 h-3.5" />
          Parliamentary Portfolio
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div 
              className="relative group cursor-pointer shrink-0" 
              onClick={() => setIsEditModalOpen(true)}
              title="Click to update photo or party"
            >
              <MpAvatar
                name={mpName}
                id={profile?.mp_id || profile?.id}
                photoUrl={profile?.photo_url}
                size="2xl"
                className="ring-4 ring-emerald-400/40 shadow-xl rounded-full bg-slate-900 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                <Camera className="w-5 h-5 mb-0.5 text-emerald-400" />
                <span>Edit Photo</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 tracking-wider uppercase">
                  <Landmark className="w-4 h-4" />
                  <span>{house} &bull; {state}</span>
                </div>
                {partyInfo && (
                  <span 
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs"
                    style={{
                      backgroundColor: partyInfo.bgColor,
                      borderColor: partyInfo.borderColor,
                      color: partyInfo.color,
                    }}
                  >
                    <Flag className="w-3 h-3" />
                    <span>{partyInfo.name}</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Hon&apos;ble MP: {mpName}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Constituency: <strong className="text-white font-semibold">{constituency}</strong> &bull; Comprehensive real-time tracking of developmental works, fund disbursement velocity, and Sentinel risk oversight under MPLADS guidelines.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-right">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fund Utilization</div>
              <div className="text-xl font-bold text-emerald-400 flex items-center justify-end gap-1.5 mt-0.5">
                <span>{metrics?.fundUtilization ?? 0}%</span>
                <span className="text-[11px] text-slate-400 font-normal">of sanctioned</span>
              </div>
            </div>

            {/* Edit Photo & Party CTA */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer shadow-sm"
              title="Change MP photo or party name"
            >
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span>Edit Photo &amp; Party</span>
            </button>

            {/* View Profile Dossier CTA */}
            <button
              onClick={() => navigateTo('/mp/profile', 'profile')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer shadow-sm"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>View Profile Dossier</span>
            </button>

            <button
              onClick={() => {
                selectProject(null);
                navigateTo('/monitoring', 'monitoring');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <span>Explore All Works</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Recommended Works</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.totalWorks ?? 0}</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className="text-blue-600 font-semibold">{metrics?.ongoingWorks ?? 0} ongoing</span>
            <span>&bull;</span>
            <span className="text-emerald-600 font-semibold">{metrics?.completedWorks ?? 0} completed</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sanctioned</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(metrics?.totalSanctionedAmount ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Disbursed: <strong className="text-slate-800">{formatCurrency(metrics?.totalDisbursedAmount ?? 0)}</strong>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.avgCompletionRate ?? 0}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${metrics?.avgCompletionRate ?? 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">High Attention Items</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">{metrics?.highAttentionWorks ?? 0}</div>
          <div className="text-xs text-slate-500 mt-2">
            {(metrics?.highAttentionWorks ?? 0) > 0 ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Requires nodal review
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All works progressing on schedule</span>
            )}
          </div>
        </div>
      </div>

      {/* Attention / Sentinel Flagged Section if high risk works exist */}
      {(metrics?.highAttentionWorks ?? 0) > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Recommended Works Requiring Administrative Attention</h3>
                <p className="text-xs text-rose-700/80">AI Sentinel risk engine flagged these works for schedule delay or expenditure discrepancy.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 text-xs font-bold self-start sm:self-auto">
              {metrics?.highAttentionWorks} Flagged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {attentionWorks.slice(0, 4).map(p => (
              <div 
                key={p.workId}
                onClick={() => {
                  selectProject(p.workId);
                  navigateTo('/monitoring', 'monitoring');
                }}
                className="p-4 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono text-slate-500 font-semibold">{p.workId}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Score: {p.risk?.score ?? 0} / 100
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{p.workDescription}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {p.risk?.factors?.[0]?.label ? `${p.risk.factors[0].label}: ${p.risk.factors[0].description || ''}` : 'Stalled work or delayed milestone inspection.'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                  <span>Sanctioned: <strong className="text-slate-800">{formatCurrency(p.sanctionAmount || 0)}</strong></span>
                  <span className="text-rose-600 font-semibold flex items-center gap-1 hover:underline">
                    Inspect in Sentinel <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Oversight Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Constituency Works Ledger</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {totalCount} total works
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => { setTabFilter('all'); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${tabFilter === 'all' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All Works
              </button>
              <button
                onClick={() => { setTabFilter('attention'); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${tabFilter === 'attention' ? 'bg-rose-100 text-rose-800 font-semibold shadow-xs' : 'text-slate-600 hover:text-rose-700'}`}
              >
                Attention ({metrics?.highAttentionWorks ?? 0})
              </button>
              <button
                onClick={() => { setTabFilter('ongoing'); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${tabFilter === 'ongoing' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Ongoing
              </button>
              <button
                onClick={() => { setTabFilter('completed'); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${tabFilter === 'completed' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Completed
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search works..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white w-44 sm:w-52"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => { loadDashboard(); loadProjects(); }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {projectsLoading ? (
          <div className="py-20 text-center">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-500 text-xs">Loading parliamentary works records…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No developmental works found matching the active filters in this constituency.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Project ID & Title</th>
                  <th className="py-3 px-4">Category & District</th>
                  <th className="py-3 px-4">Sanction Amount</th>
                  <th className="py-3 px-4">Disbursed / %</th>
                  <th className="py-3 px-4">Sentinel Risk</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Intelligence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map(p => {
                  const sanctionAmt = p.sanctionAmount || 0;
                  const totalPaid = p.totalPaid || 0;
                  const disbPercent = sanctionAmt > 0 
                    ? Math.round((totalPaid / sanctionAmt) * 100) 
                    : 0;

                  return (
                    <tr key={p.workId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-mono text-[11px] text-slate-400 mb-0.5">{p.workId}</div>
                        <div className="font-semibold text-slate-900 truncate" title={p.workDescription}>{p.workDescription}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{p.workCategory || 'General'}</div>
                        <div className="text-slate-400 text-[10px]">{p.district || constituency}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatCurrency(sanctionAmt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-800">{formatCurrency(totalPaid)}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-16 bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-emerald-600 h-full rounded-full" 
                              style={{ width: `${Math.min(100, disbPercent)}%` }} 
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">{disbPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          p.risk?.level === 'HIGH' 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : p.risk?.level === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {p.risk?.level ?? 'LOW'} ({p.risk?.score ?? 0})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.isCompleted 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {p.isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            selectProject(p.workId);
                            navigateTo('/monitoring', 'monitoring');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                        >
                          <span>Analyze</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <div>
              Showing page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MP Profile & Party Edit Modal */}
      {isEditModalOpen && (
        <EditMpProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mpProfile={{
            id: profile?.id || '',
            full_name: profile?.full_name || mpName,
            mp_name: profile?.mp_name || mpName,
            state: profile?.state || state,
            constituency: profile?.constituency || constituency,
            house: profile?.house || house,
            photo_url: profile?.photo_url,
            party: mpParty,
            email: profile?.email,
          }}
          onSuccess={(updated) => {
            if (updated.party) setMpPartyState(updated.party);
          }}
        />
      )}
    </div>
  );
}
export default MpDashboard;
