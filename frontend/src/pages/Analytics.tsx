import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../data/store';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  BarChart3, PieChart as PieIcon, TrendingUp, Layers,
  DollarSign, FolderOpen, AlertTriangle, CheckCircle2,
  RefreshCw, AlertCircle, ShieldCheck
} from 'lucide-react';
import { OfficialFilterBar, OfficialFilterState } from '../components/OfficialFilterBar';
import { CategoryRiskDistribution } from '../components/CategoryRiskDistribution';
import { getAnalyticsObservatory, AnalyticsObservatoryData } from '../services/analyticsService';

const STATUS_COLOR_MAP: Record<string, string> = {
  'Physical Inspection': '#0084ff',
  'Work Completed': '#10b981',
  'Sanction': '#f59e0b',
  'Vendor Identification': '#8b5cf6',
  'Unknown': '#64748b',
};

const PALETTE = ['#0084ff', '#10b981', '#f59e0b', '#8b5cf6', '#ea580c', '#64748b'];

export function Analytics() {
  const { projects, activeHouse } = useAppStore();
  const { profile } = useAuthStore();

  const isDistrictOfficer = profile?.role === 'DISTRICT_OFFICER';
  const isStateNodal = profile?.role === 'STATE_NODAL_OFFICER';
  const isMP = profile?.role === 'MP';
  const lockedState = (isStateNodal || isDistrictOfficer || isMP) ? (profile?.state || '') : '';
  const lockedDistrict = isDistrictOfficer ? (profile?.district || '') : '';
  const cleanDistrict = lockedDistrict ? lockedDistrict.split('(')[0].trim() : '';
  const lockedConstituency = isMP ? (profile?.constituency || '') : '';
  const lockedMPName = isMP ? (profile?.mp_name || profile?.full_name || '') : '';

  const scopeBadge = isMP
    ? `Constituency: ${profile?.constituency} (${profile?.state}) · Hon'ble MP ${profile?.mp_name || profile?.full_name}`
    : isDistrictOfficer
    ? `District: ${cleanDistrict}, ${profile?.state}`
    : isStateNodal
    ? `State: ${profile?.state}`
    : 'National';

  const [filters, setFilters] = useState<OfficialFilterState>({
    search: '',
    house: isMP ? 'Lok Sabha' : activeHouse,
    tenure: (isMP || activeHouse === 'Lok Sabha') ? '18th Lok Sabha' : 'Current Rajya Sabha',
    state: lockedState,
    constituency: lockedConstituency,
    mpName: lockedMPName,
    riskLevel: '',
    status: '',
    category: '',
  });

  const [observatoryData, setObservatoryData] = useState<AnalyticsObservatoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync house when global activeHouse changes
  const prevHouseRef = React.useRef(activeHouse);
  useEffect(() => {
    if (isMP) return; // MP is locked to Lok Sabha
    if (prevHouseRef.current !== activeHouse) {
      prevHouseRef.current = activeHouse;
      setFilters(f => ({
        ...f,
        house: activeHouse,
        tenure: activeHouse === 'Lok Sabha' ? '18th Lok Sabha' : 'Current Rajya Sabha',
        state: lockedState,
        constituency: '',
        mpName: '',
        riskLevel: '',
        status: '',
        category: '',
        search: '',
      }));
    }
  }, [activeHouse, lockedState, isMP]);

  // Fetch unified observatory analytics from backend / Supabase RPC
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsObservatory(isMP ? 'Lok Sabha' : activeHouse, {
        state: isMP ? (profile?.state || filters.state) : (lockedState || filters.state),
        constituency: isMP ? (profile?.constituency || filters.constituency) : filters.constituency,
        mpName: isMP ? (profile?.mp_name || filters.mpName) : filters.mpName,
        district: isDistrictOfficer ? lockedDistrict : undefined,
        riskLevel: filters.riskLevel,
        status: filters.status,
        category: filters.category,
        tenure: filters.tenure,
        search: filters.search,
      });
      setObservatoryData(data);
    } catch (err: any) {
      console.error('[Analytics] Error fetching observatory analytics:', err);
      setError(err.message || 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [activeHouse, filters, lockedState, isDistrictOfficer, lockedDistrict, isMP, profile]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = useMemo(() => {
    return observatoryData?.kpis || {
      total: 0,
      totalSanctionAmount: 0,
      totalDisbursed: 0,
      highRisk: 0,
      medRisk: 0,
      lowRisk: 0,
      completed: 0,
      pendingSanction: 0,
    };
  }, [observatoryData]);

  const districtData = useMemo(() => {
    const raw = observatoryData?.districtRisk || [];
    const userRole = profile?.role;

    const formatted = raw.map((d: any) => {
      // Clean district name: remove parenthetical IDA suffixes, e.g. "PRAYAGRAJ(DISTRICT MAGISTRATE PRAYAGRAJ_IDA)" -> "PRAYAGRAJ"
      const cleanName = (d.district || '')
        .replace(/\([^)]*\)/g, '')
        .replace(/_/g, ' ')
        .trim() || d.district;

      const total = d.total || ((d.high || 0) + (d.med || 0) + (d.low || 0)) || 1;
      const high = d.high || 0;
      const med = d.med || 0;
      const highPct = Math.round((high / total) * 100);
      const medPct = Math.round((med / total) * 100);

      return {
        ...d,
        district: cleanName,
        rawDistrict: d.district,
        total,
        high,
        med,
        highPct,
        medPct,
      };
    });

    // If District Officer: show their assigned district
    if (userRole === 'DISTRICT_OFFICER' && profile?.district) {
      const cleanTarget = profile.district.split('(')[0].trim().toLowerCase();
      const match = formatted.filter((d: any) =>
        d.rawDistrict?.toLowerCase().includes(cleanTarget) ||
        d.district?.toLowerCase().includes(cleanTarget)
      );
      if (match.length > 0) return match.slice(0, 10);
    }

    // Sort by high risk count descending, then total descending
    const sorted = formatted
      .filter((d: any) => d.high > 0 || d.med > 0)
      .sort((a: any, b: any) => (b.high - a.high) || (b.total - a.total));

    // STRICTLY Top 10 districts!
    return sorted.slice(0, 10);
  }, [observatoryData, profile]);

  const hasHighRiskInDistricts = useMemo(() => {
    return districtData.some(d => d.high > 0 || d.med > 0);
  }, [districtData]);

  const categoryData = useMemo(() => {
    return observatoryData?.categoryRisk || [];
  }, [observatoryData]);

  const statusData = useMemo(() => {
    const raw = observatoryData?.statusBreakdown || [];
    return raw.map((entry, index) => ({
      ...entry,
      color: STATUS_COLOR_MAP[entry.name] || PALETTE[index % PALETTE.length],
    }));
  }, [observatoryData]);

  const fyTrend = useMemo(() => {
    return observatoryData?.fyTrend || [];
  }, [observatoryData]);

  const houseTotalCount = activeHouse === 'Lok Sabha' ? 65000 : 79219;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#005eb2] mb-1 flex items-center gap-2">
            <BarChart3 size={11} />
            Performance Observatory — Analytics · {activeHouse} · {scopeBadge}
          </p>
          <h1 className="text-2xl font-bold text-[#000a1f]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            MPLADS Analytics &amp; Empirical Insights
          </h1>
          <p className="text-xs text-[#747780] mt-0.5">
            {isMP
              ? `Aggregated statistical analysis for ${profile?.constituency} (${profile?.state}) under Hon'ble MP ${profile?.mp_name || profile?.full_name}`
              : isDistrictOfficer
              ? `Aggregated statistical analysis for ${cleanDistrict} (${profile?.state}) derived dynamically from active ${activeHouse} dataset`
              : isStateNodal
              ? `Aggregated statistical analysis for ${profile?.state} derived dynamically from active ${activeHouse} dataset`
              : `Aggregated statistical analysis derived dynamically from active ${activeHouse} dataset`}
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#005eb2] font-semibold">
            <RefreshCw size={14} className="animate-spin" />
            <span>Loading analytics…</span>
          </div>
        )}
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-sm text-xs text-[#991b1b]">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-[#dc2626] flex-shrink-0" />
            <span>Unable to load analytics data: {error}</span>
          </div>
          <button
            onClick={fetchAnalytics}
            className="text-[11px] font-bold text-[#dc2626] hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Official Filter Bar Panel ─────────────────────────────────── */}
      <div className="bg-white border border-[#E9ECEF] rounded-xl p-4 shadow-sm">
        <OfficialFilterBar
          projects={projects}
          filteredProjects={[]}
          filteredCount={kpis.total}
          totalCount={houseTotalCount}
          filters={filters}
          onFilterChange={(f) => {
            if (isMP) {
              setFilters({
                ...f,
                house: 'Lok Sabha',
                state: lockedState,
                constituency: lockedConstituency,
                mpName: lockedMPName,
              });
            } else {
              setFilters(lockedState ? { ...f, state: lockedState } : f);
            }
          }}
          onReset={() => setFilters({
            search: '',
            house: isMP ? 'Lok Sabha' : activeHouse,
            tenure: (isMP || activeHouse === 'Lok Sabha') ? '18th Lok Sabha' : 'Current Rajya Sabha',
            state: lockedState,
            constituency: lockedConstituency,
            mpName: lockedMPName,
            riskLevel: '',
            status: '',
            category: '',
          })}
          exportFilename="MPLADS_Analytics"
          accentColor="#005eb2"
          showExcel={false}
          showCSV={false}
          showPDF={true}
        />
      </div>

      {/* ── Dynamic Filter Summary KPI Metrics ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0084ff]" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0084ff] mb-1.5">
                Filtered Works
              </p>
              <p className="text-2xl font-bold text-[#000a1f] leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {loading && !observatoryData ? '...' : kpis.total.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-[#747780] mt-1.5">Matching criteria</p>
            </div>
            <div className="p-2 rounded-sm bg-[#0084ff]/10 text-[#0084ff]">
              <FolderOpen size={18} />
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#6d28d9]" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6d28d9] mb-1.5">
                Sanctioned Amount
              </p>
              <p className="text-2xl font-bold text-[#000a1f] leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {loading && !observatoryData ? '...' : formatCurrency(kpis.totalSanctionAmount)}
              </p>
              <p className="text-[11px] text-[#747780] mt-1.5">Filtered sum</p>
            </div>
            <div className="p-2 rounded-sm bg-[#6d28d9]/10 text-[#6d28d9]">
              <DollarSign size={18} />
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#198754]" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#198754] mb-1.5">
                Expenditure / Disbursed
              </p>
              <p className="text-2xl font-bold text-[#000a1f] leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {loading && !observatoryData ? '...' : formatCurrency(kpis.totalDisbursed)}
              </p>
              <p className="text-[11px] text-[#747780] mt-1.5">Released funds</p>
            </div>
            <div className="p-2 rounded-sm bg-[#198754]/10 text-[#198754]">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#DC3545]" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#DC3545] mb-1.5">
                High-Risk Anomalies
              </p>
              <p className="text-2xl font-bold text-[#DC3545] leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {loading && !observatoryData ? '...' : kpis.highRisk.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-[#747780] mt-1.5">Priority scrutiny</p>
            </div>
            <div className="p-2 rounded-sm bg-[#DC3545]/10 text-[#DC3545]">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Section ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: High Risk Works Concentration by District */}
        <div className="panel p-5 flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[#000a1f] flex items-center gap-1.5">
              <BarChart3 size={14} className="text-[#DC3545]" />
              High-Risk Project Concentration by District (Top 10)
            </div>
            {hasHighRiskInDistricts && (
              <span className="text-[10px] text-[#747780]">Sorted by High Risk Count</span>
            )}
          </div>
          <div className="flex-1 w-full mt-2 flex flex-col justify-center">
            {loading && !observatoryData ? (
              <div className="flex flex-col items-center justify-center h-full text-[#747780] text-xs">
                <RefreshCw size={20} className="animate-spin text-[#005eb2] mb-2" />
                <span>Aggregating district data…</span>
              </div>
            ) : !hasHighRiskInDistricts ? (
              <div className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-lg my-1">
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full mb-2.5">
                  <ShieldCheck size={26} />
                </div>
                <p className="text-sm font-bold text-[#000a1f]">
                  No high-risk projects in the current filtered dataset.
                </p>
                <p className="text-xs text-[#747780] mt-1.5 max-w-md">
                  All {kpis.total.toLocaleString('en-IN')} projects across {filters.state || 'the active selection'} operate within standard risk parameters (0 High-Risk anomalies detected{kpis.medRisk > 0 ? `; ${kpis.medRisk} Medium-Risk project${kpis.medRisk > 1 ? 's' : ''} under routine monitoring` : ''}).
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData} margin={{ top: 10, right: 15, left: -15, bottom: 40 }}>
                  <XAxis
                    dataKey="district"
                    stroke="#c4c6d0"
                    fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tick={{ fill: '#44474f' }}
                    height={50}
                  />
                  <YAxis stroke="#c4c6d0" fontSize={10} tick={{ fill: '#44474f' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #E9ECEF',
                      borderRadius: '4px',
                      color: '#141d23',
                      fontSize: '11px',
                      boxShadow: '0 4px 16px rgba(0,10,31,0.1)',
                    }}
                    formatter={(val: number, name: string, item: any) => {
                      if (name === 'High Risk') {
                        return [`${val} projects (${item.payload.highPct}% of district works)`, name];
                      }
                      return [`${val} projects (${item.payload.medPct}% of district works)`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#44474f' }} />
                  <Bar dataKey="high" name="High Risk" fill="#DC3545" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="med" name="Medium Risk" fill="#FFC107" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Financial Year Spend Trend */}
        <div className="panel p-5 flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[#000a1f] flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#198754]" />
              Sanction vs Disbursement Trend by FY (₹ Crores)
            </div>
            <span className="text-[10px] text-[#747780]">
              {fyTrend.length} Financial Year{fyTrend.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex-1 w-full mt-2 flex flex-col justify-center">
            {loading && !observatoryData ? (
              <div className="flex flex-col items-center justify-center h-full text-[#747780] text-xs">
                <RefreshCw size={20} className="animate-spin text-[#005eb2] mb-2" />
                <span>Aggregating financial trends…</span>
              </div>
            ) : fyTrend.length === 0 ? (
              <div className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center text-[#747780] text-xs">
                No financial year data available for the active selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fyTrend} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                  <XAxis dataKey="fy" stroke="#c4c6d0" fontSize={11} tick={{ fill: '#44474f' }} />
                  <YAxis stroke="#c4c6d0" fontSize={11} tick={{ fill: '#44474f' }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`₹${Number(value || 0).toFixed(2)} Cr`, name]}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #E9ECEF',
                      borderRadius: '4px',
                      color: '#141d23',
                      fontSize: '11px',
                      boxShadow: '0 4px 16px rgba(0,10,31,0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#44474f' }} />
                  <Line
                    type="monotone"
                    dataKey="sanctioned"
                    name="Sanctioned (Cr)"
                    stroke="#6d28d9"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#6d28d9' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="disbursed"
                    name="Disbursed (Cr)"
                    stroke="#198754"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#198754' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Risk Score by Work Category */}
        <div className="lg:col-span-2">
          <CategoryRiskDistribution
            data={categoryData}
            loading={loading && !observatoryData}
            title="Risk Score by Work Category"
            subtitle="Sectoral risk score benchmarking (0–100 scale) and vulnerability index across infrastructure categories."
            scopeLabel={
              cleanDistrict
                ? `District: ${cleanDistrict}`
                : filters.state
                ? `State: ${filters.state}`
                : filters.mpName
                ? `MP: ${filters.mpName}`
                : 'National Scope'
            }
            onSelectCategory={(cat) => {
              setFilters(f => ({ ...f, category: cat }));
            }}
            selectedCategory={filters.category}
          />
        </div>

        {/* Chart 4: Work Status Breakdown */}
        <div className="panel p-5 flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-[#000a1f] flex items-center gap-1.5">
              <PieIcon size={14} className="text-[#6d28d9]" />
              Overall Work Implementation Status
            </div>
            <span className="text-[10px] text-[#747780]">Active Filter Distribution</span>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            {loading && !observatoryData ? (
              <div className="flex flex-col items-center justify-center h-full text-[#747780] text-xs">
                <RefreshCw size={20} className="animate-spin text-[#005eb2] mb-2" />
                <span>Aggregating implementation status…</span>
              </div>
            ) : statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-[#747780] text-xs">
                No implementation status data available for the active selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #E9ECEF',
                      borderRadius: '4px',
                      color: '#141d23',
                      fontSize: '11px',
                      boxShadow: '0 4px 16px rgba(0,10,31,0.1)',
                    }}
                    formatter={(value: number, name: string, item: any) => [
                      `${value.toLocaleString('en-IN')} works (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#44474f', paddingTop: '10px' }}
                    formatter={(value: string, entry: any) => {
                      const item = statusData.find(s => s.name === value);
                      return `${value} (${item?.percentage || 0}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
