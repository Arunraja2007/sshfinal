import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/store';
import { MpService } from '../services/mpService';
import type { MpProfileResponse } from '../types/mp';
import { formatCurrency } from '../utils';
import { MpAvatar } from '../components/MpAvatar';
import { getMpParty, getPartyInfo } from '../services/mpPartyService';
import { EditMpProfileModal } from '../components/EditMpProfileModal';
import {
  Landmark,
  ShieldAlert,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
  Mail,
  Calendar,
  Building,
  TrendingUp,
  ChevronRight,
  Camera,
  Edit3,
  Flag,
} from 'lucide-react';

export function MpProfilePage() {
  const { profile } = useAuthStore();
  const { setCurrentPage, selectProject } = useAppStore();

  const [data, setData] = useState<MpProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mpParty, setMpPartyState] = useState(() => getMpParty(profile?.mp_name || profile?.id || profile?.full_name));

  useEffect(() => {
    const handlePartyUpdated = () => {
      setMpPartyState(getMpParty(profile?.mp_name || profile?.id || profile?.full_name));
    };
    window.addEventListener('mp-party-updated', handlePartyUpdated);
    return () => window.removeEventListener('mp-party-updated', handlePartyUpdated);
  }, [profile]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await MpService.getProfile();
        setData(res);
      } catch (err: any) {
        console.error('Failed to load MP profile dossier:', err);
        setError(err.message || 'Failed to load MP profile dossier');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [profile?.id]);

  const navigateTo = (path: string, pageId?: string) => {
    if (pageId) {
      setCurrentPage(pageId);
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-slate-800">Loading Parliamentary Portfolio Dossier…</h3>
        <p className="text-xs text-slate-500 mt-1">Aggregating Lok Sabha records, allocations, and risk diagnostics.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Dossier Unavailable</h2>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          {error || 'Unable to retrieve parliamentary dossier for the active Member of Parliament session.'}
        </p>
        <button
          onClick={() => navigateTo('/mp/dashboard', 'dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to MP Dashboard</span>
        </button>
      </div>
    );
  }

  const { mpInfo, portfolioSummary, categoryBreakdown, districtBreakdown, attentionItems, recentWorks } = data;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Navigation Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigateTo('/mp/dashboard', 'dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to MP Dashboard</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">MPLADS Sentinel</span>
          <span>&rsaquo;</span>
          <span>Lok Sabha</span>
          <span>&rsaquo;</span>
          <span className="text-emerald-700 font-semibold">{mpInfo.constituency}</span>
        </div>
      </div>

      {/* Hero Dignitary Profile Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061e38] via-[#09294f] to-[#041527] text-white p-6 md:p-8 border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* MP Portrait with clean fallback and edit overlay */}
            <div 
              className="relative group cursor-pointer shrink-0"
              onClick={() => setIsEditModalOpen(true)}
              title="Click to update photo or party"
            >
              <MpAvatar
                name={mpInfo.mpName}
                id={mpInfo.mpId}
                photoUrl={mpInfo.photoUrl}
                size="2xl"
                className="ring-4 ring-emerald-400/40 shadow-2xl rounded-full bg-slate-900 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                <Camera className="w-5 h-5 mb-0.5 text-emerald-400" />
                <span>Edit</span>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-bold tracking-wider text-white uppercase border border-emerald-400/50 shadow">
                LS
              </span>
            </div>

            {/* MP Information */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  {mpInfo.house} &bull; 18th Lok Sabha
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {mpInfo.state}
                </span>
                {(() => {
                  const pInfo = getPartyInfo(mpParty);
                  return (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs"
                      style={{
                        backgroundColor: pInfo.bgColor,
                        borderColor: pInfo.borderColor,
                        color: pInfo.color,
                      }}
                    >
                      <Flag className="w-3 h-3" />
                      <span>{pInfo.name}</span>
                    </span>
                  );
                })()}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Hon&apos;ble MP {mpInfo.mpName}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-1 gap-x-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <strong className="text-emerald-400 font-semibold">Constituency:</strong> {mpInfo.constituency}
                </span>
                {mpInfo.email && (
                  <span className="flex items-center gap-1 text-slate-400 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {mpInfo.email}
                  </span>
                )}
                <span className="text-slate-400">
                  <strong className="text-slate-300 font-medium">UID:</strong> {mpInfo.mpId}
                </span>
              </div>

              <p className="text-xs text-slate-300/90 max-w-2xl pt-1 leading-relaxed">
                Autonomous developmental portfolio dashboard mandated under the MPLADS guidelines, monitoring recommendation pipelines, expenditure verification, and developmental velocity.
              </p>
            </div>
          </div>

          {/* Allocation Badge & Actions */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 text-right backdrop-blur-md">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Parliamentary Allocation Limit</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {mpInfo.allocatedLimit ? formatCurrency(mpInfo.allocatedLimit) : '₹5,00,00,000'}
              </div>
              <div className="text-[10px] text-slate-400">Standard Scheme Entitlement</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer shadow-sm"
                title="Change MP photo or party name"
              >
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Edit Photo &amp; Party</span>
              </button>

              <button
                onClick={() => {
                  selectProject(null);
                  navigateTo('/monitoring', 'monitoring');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
              >
                <span>Explore All Works</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recommended Works */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recommended</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{portfolioSummary.totalWorks}</div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
            <span className="text-blue-600 font-semibold">{portfolioSummary.ongoingCount} ongoing</span>
            <span>&bull;</span>
            <span className="text-emerald-600 font-semibold">{portfolioSummary.completedCount} completed</span>
          </div>
        </div>

        {/* Total Sanctioned */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sanctioned</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(portfolioSummary.totalSanctioned)}</div>
          <div className="text-xs text-slate-500 mt-2">
            Committed constituency development
          </div>
        </div>

        {/* Total Disbursed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Disbursed</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(portfolioSummary.totalDisbursed)}</div>
          <div className="text-xs text-slate-500 mt-2">
            Disbursement ratio: <strong className="text-slate-800">
              {portfolioSummary.totalSanctioned > 0 
                ? Math.round((portfolioSummary.totalDisbursed / portfolioSummary.totalSanctioned) * 100)
                : 0}%
            </strong>
          </div>
        </div>

        {/* Completion Progress & Sentinel Risk */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Execution Velocity</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{portfolioSummary.avgProgress}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${portfolioSummary.avgProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>High Risk: <strong className="text-rose-600">{portfolioSummary.highRiskCount}</strong></span>
            <span>Medium: <strong className="text-amber-600">{portfolioSummary.mediumRiskCount}</strong></span>
            <span>Low: <strong className="text-emerald-600">{portfolioSummary.lowRiskCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Categories & Districts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Works by Development Sector</h3>
                <p className="text-xs text-slate-500">Distribution across infrastructure, health, water, and community assets</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {categoryBreakdown.length} Sectors
            </span>
          </div>

          <div className="space-y-3.5 mt-4">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No sectoral breakdown available.</p>
            ) : (
              categoryBreakdown.map(cat => {
                const percent = portfolioSummary.totalSanctioned > 0
                  ? Math.round((cat.sanctioned / portfolioSummary.totalSanctioned) * 100)
                  : 0;
                return (
                  <div key={cat.category} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800">{cat.category}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(cat.sanctioned)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{cat.count} works &bull; {percent}% of budget</span>
                      <span>{cat.completed} completed &bull; {cat.ongoing} ongoing</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* District Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">District Coverage & Disbursement</h3>
                <p className="text-xs text-slate-500">Financial allocation and physical progress across districts</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {districtBreakdown.length} Districts
            </span>
          </div>

          <div className="space-y-3.5 mt-4">
            {districtBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No district records linked to constituency.</p>
            ) : (
              districtBreakdown.map(dist => {
                const disbPercent = dist.sanctioned > 0
                  ? Math.round((dist.disbursed / dist.sanctioned) * 100)
                  : 0;
                return (
                  <div key={dist.district} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800">{dist.district}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(dist.sanctioned)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, disbPercent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{dist.count} works ({dist.completed} completed)</span>
                      <span>Disbursed: <strong className="text-slate-700">{formatCurrency(dist.disbursed)}</strong> ({disbPercent}%)</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sentinel High Attention Works Section */}
      {attentionItems.length > 0 && (
        <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Recommended Works Requiring Administrative Intervention</h3>
                <p className="text-xs text-rose-700/80">AI Sentinel flags identifying stalled milestones, disbursement lags, or reporting delays</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 text-xs font-bold self-start sm:self-auto">
              {attentionItems.length} High Attention Items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {attentionItems.map(item => (
              <div
                key={item.workId}
                onClick={() => {
                  selectProject(item.workId);
                  navigateTo('/monitoring', 'monitoring');
                }}
                className="p-4 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs text-slate-500 font-semibold">{item.workId}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Risk Score: {item.riskScore} / 100
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{item.workDescription}</h4>
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-100">
                  <span>Sanctioned: <strong className="text-slate-900">{formatCurrency(item.sanctionAmount || 0)}</strong></span>
                  <span className="text-rose-600 font-semibold flex items-center gap-1 hover:underline">
                    Inspect in Sentinel <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Works Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Parliamentary Works Roster</h3>
            <p className="text-xs text-slate-500">Recently sanctioned and recommended works in constituency</p>
          </div>
          <button
            onClick={() => {
              selectProject(null);
              navigateTo('/monitoring', 'monitoring');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            <span>View Full Register in Project Intelligence</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Project ID & Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Sanction Amount</th>
                <th className="py-3 px-4">Disbursed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentWorks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No project records found in this constituency.
                  </td>
                </tr>
              ) : (
                recentWorks.map(p => (
                  <tr key={p.workId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-mono text-[11px] text-slate-400">{p.workId}</div>
                      <div className="font-medium text-slate-800 truncate" title={p.workDescription}>{p.workDescription}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{p.workCategory || 'General'}</div>
                      <div className="text-[10px] text-slate-400">{p.district}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatCurrency(p.sanctionAmount || 0)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {formatCurrency(p.totalPaid || 0)}
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        <span>Analyze</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MP Profile & Party Edit Modal */}
      {isEditModalOpen && (
        <EditMpProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mpProfile={{
            id: mpInfo.mpId || profile?.id || '',
            full_name: mpInfo.mpName || profile?.full_name || '',
            mp_name: mpInfo.mpName,
            state: mpInfo.state || profile?.state,
            constituency: mpInfo.constituency || profile?.constituency,
            house: mpInfo.house || profile?.house,
            photo_url: mpInfo.photoUrl || profile?.photo_url,
            party: mpParty,
            email: mpInfo.email || profile?.email,
          }}
          onSuccess={(updated) => {
            if (updated.party) setMpPartyState(updated.party);
            if (data && updated.photo_url) {
              setData({
                ...data,
                mpInfo: {
                  ...data.mpInfo,
                  photoUrl: updated.photo_url,
                  mpName: updated.full_name || data.mpInfo.mpName,
                }
              });
            }
          }}
        />
      )}
    </div>
  );
}
export default MpProfilePage;
