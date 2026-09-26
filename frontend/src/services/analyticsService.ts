import { supabase } from './client';
import { apiFetch } from './apiClient';
import type { DistrictSummary, CategorySummary, MPSummary } from '../types';
import { getRajyaSabhaMPsByState } from '../data/rajyaSabhaMPs';
import { useAuthStore } from '../store/authStore';

export interface DashboardKPIs {
  total: number;
  totalSanctionAmount: number;
  totalDisbursed: number;
  completed: number;
  highRisk: number;
  medRisk: number;
  lowRisk: number;
  pendingSanction: number;
  requiresVerification: number;
  avgRiskScore: number;
}

export interface FilterOptions {
  states?: string[];
  constituencies?: string[];
  mps?: string[];
  categories?: string[];
  statuses?: string[];
}

export async function getDashboardKPIs(
  house: 'Lok Sabha' | 'Rajya Sabha',
  filters: {
    state?: string;
    district?: string;
    constituency?: string;
    mpName?: string;
    riskLevel?: string;
    status?: string;
    category?: string;
    tenure?: string;
    search?: string;
  } = {}
): Promise<DashboardKPIs> {
  let effectiveState = filters.state;
  let effectiveDistrict = filters.district;
  let effectiveConstituency = filters.constituency;
  let effectiveMp = filters.mpName;
  let effectiveHouse = house;

  const authProfile = useAuthStore.getState().profile;
  if (authProfile?.role === 'STATE_NODAL_OFFICER' && authProfile.state) {
    effectiveState = authProfile.state;
  } else if (authProfile?.role === 'DISTRICT_OFFICER') {
    if (authProfile.state) effectiveState = authProfile.state;
    if (authProfile.district) effectiveDistrict = authProfile.district;
  } else if (authProfile?.role === 'MP') {
    effectiveHouse = 'Lok Sabha';
    if (authProfile.state) effectiveState = authProfile.state;
    if (authProfile.constituency) effectiveConstituency = authProfile.constituency;
    if (authProfile.mp_name || authProfile.full_name) {
      effectiveMp = authProfile.mp_name || authProfile.full_name;
    }
  }

  const { data, error } = await supabase.rpc('get_dashboard_kpis', {
    p_house: effectiveHouse,
    p_state: effectiveState || null,
    p_constituency: effectiveConstituency || null,
    p_mp: effectiveMp || null,
    p_risk: filters.riskLevel || null,
    p_status: filters.status || null,
    p_category: filters.category || null,
    p_tenure: filters.tenure || null,
    p_search: filters.search || null,
    p_district: effectiveDistrict || null,
  });

  if (error) {
    console.error('[Supabase] Error calling get_dashboard_kpis:', error);
    throw error;
  }

  return {
    total: Number(data?.total || 0),
    totalSanctionAmount: Number(data?.totalSanctionAmount || 0),
    totalDisbursed: Number(data?.totalDisbursed || 0),
    completed: Number(data?.completed || 0),
    highRisk: Number(data?.highRisk || 0),
    medRisk: Number(data?.medRisk || 0),
    lowRisk: Number(data?.lowRisk || 0),
    pendingSanction: Number(data?.pendingSanction || 0),
    requiresVerification: Number(data?.requiresVerification || 0),
    avgRiskScore: Number(data?.avgRiskScore || 0),
  };
}

export async function getDistinctFilterOptions(
  house: 'Lok Sabha' | 'Rajya Sabha',
  state?: string
): Promise<FilterOptions> {
  const { data, error } = await supabase.rpc('get_distinct_filter_options', {
    p_house: house,
    p_state: state || null,
  });

  if (error) {
    console.error('[Supabase] Error fetching filter options:', error);
    if (house === 'Rajya Sabha') {
      return {
        states: [],
        constituencies: [],
        mps: getRajyaSabhaMPsByState(state),
        categories: [],
        statuses: [],
      };
    }
    return {};
  }

  const mps = house === 'Rajya Sabha'
    ? (Array.isArray(data?.mps) && data.mps.length > 0 ? data.mps : getRajyaSabhaMPsByState(state))
    : (data?.mps || []);

  return {
    states: data?.states || [],
    constituencies: house === 'Rajya Sabha' ? [] : (data?.constituencies || []),
    mps,
    categories: data?.categories || [],
    statuses: data?.statuses || [],
  };
}

export async function getDistrictAnalytics(
  house: 'Lok Sabha' | 'Rajya Sabha',
  state?: string
): Promise<DistrictSummary[]> {
  try {
    const obs = await getAnalyticsObservatory(house, { state });
    if (obs && obs.districtRisk && obs.districtRisk.length > 0) {
      return obs.districtRisk.map(d => ({
        district: d.district,
        totalProjects: d.total,
        highRisk: d.high,
        mediumRisk: d.med,
        lowRisk: d.low,
        totalSanctionAmount: 0,
        totalDisbursed: 0,
        avgScore: 0,
      }));
    }
  } catch (err) {
    console.warn('[AnalyticsService] Observatory failed for district analytics:', err);
  }
  return [];
}

export async function getCategoryAnalytics(
  house: 'Lok Sabha' | 'Rajya Sabha'
): Promise<CategorySummary[]> {
  const authProfile = useAuthStore.getState().profile;
  const effectiveHouse = authProfile?.role === 'MP' ? 'Lok Sabha' : house;
  try {
    const res = await apiFetch(`/api/analytics/categories?house=${encodeURIComponent(effectiveHouse)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[AnalyticsService] API getCategoryAnalytics failed, attempting observatory:', err);
  }

  try {
    const obs = await getAnalyticsObservatory(effectiveHouse);
    if (obs && obs.categoryRisk && obs.categoryRisk.length > 0) {
      return obs.categoryRisk.map(c => ({
        category: c.category,
        totalProjects: c.total,
        highRisk: c.high,
        avgAmount: 0,
        avgScore: 0,
      }));
    }
  } catch (err) {
    console.warn('[AnalyticsService] Observatory fallback failed for categories:', err);
  }

  return [];
}

export async function getMPAnalytics(
  house: 'Lok Sabha' | 'Rajya Sabha'
): Promise<MPSummary[]> {
  const authProfile = useAuthStore.getState().profile;
  const effectiveHouse = authProfile?.role === 'MP' ? 'Lok Sabha' : house;
  const tbl = effectiveHouse === 'Rajya Sabha' ? 'rajya_sabha_projects' : 'lok_sabha_projects';

  let query = supabase
    .from(tbl)
    .select('mp_name, constituency, allocated_limit, sanction_amount, risk_level');

  if (authProfile?.role === 'MP') {
    if (authProfile.mp_name) {
      query = query.ilike('mp_name', `%${authProfile.mp_name.trim()}%`);
    } else if (authProfile.constituency) {
      query = query.eq('constituency', authProfile.constituency);
    }
  }

  const { data, error } = await query.limit(3000);

  if (error || !data) return [];

  const mpMap = new Map<string, {
    constituency: string;
    total: number;
    allocated: number | null;
    sanctioned: number;
    high: number;
  }>();

  for (const row of data) {
    const mp = row.mp_name || 'Unknown MP';
    const entry = mpMap.get(mp) || {
      constituency: row.constituency || '',
      total: 0,
      allocated: row.allocated_limit !== null ? Number(row.allocated_limit) : null,
      sanctioned: 0,
      high: 0,
    };

    entry.total++;
    entry.sanctioned += Number(row.sanction_amount || 0);
    if (row.risk_level === 'HIGH') entry.high++;
    mpMap.set(mp, entry);
  }

  return Array.from(mpMap.entries()).map(([mp, stats]) => ({
    mp,
    constituency: stats.constituency,
    totalProjects: stats.total,
    allocatedAmount: stats.allocated,
    totalSanctioned: stats.sanctioned,
    highRisk: stats.high,
  }));
}

export interface AnalyticsObservatoryData {
  kpis: {
    total: number;
    totalSanctionAmount: number;
    totalDisbursed: number;
    highRisk: number;
    medRisk: number;
    lowRisk: number;
    completed: number;
    pendingSanction: number;
  };
  districtRisk: Array<{
    district: string;
    total: number;
    high: number;
    med: number;
    low: number;
    concentration: number;
  }>;
  categoryRisk: Array<{
    category: string;
    total: number;
    high: number;
    med: number;
    low: number;
  }>;
  statusBreakdown: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  fyTrend: Array<{
    fy: string;
    sanctioned: number;
    disbursed: number;
    total_projects: number;
  }>;
}

export function normalizeObservatoryData(raw: any): AnalyticsObservatoryData {
  if (!raw) {
    return {
      kpis: {
        total: 0,
        totalSanctionAmount: 0,
        totalDisbursed: 0,
        highRisk: 0,
        medRisk: 0,
        lowRisk: 0,
        completed: 0,
        pendingSanction: 0,
      },
      districtRisk: [],
      categoryRisk: [],
      statusBreakdown: [],
      fyTrend: [],
    };
  }

  // 1. KPIs
  const k = raw.kpis || {};
  const total = Number(k.total ?? 0);
  const totalSanctionAmount = Number(k.total_sanction ?? k.totalSanctionAmount ?? 0);
  const totalDisbursed = Number(k.total_disbursed ?? k.totalDisbursed ?? 0);
  const highRisk = Number(k.high_risk ?? k.highRisk ?? 0);
  const medRisk = Number(k.med_risk ?? k.medRisk ?? 0);
  const lowRisk = Number(k.low_risk ?? k.lowRisk ?? 0);
  const completed = Number(k.completed ?? 0);
  const pendingSanction = Number(k.pending_sanction ?? k.pendingSanction ?? 0);

  // 2. District Risk
  const rawDistricts = Array.isArray(raw.districtRisk) ? raw.districtRisk : [];
  const districtRisk = rawDistricts.map((d: any) => {
    const rawName = String(d.district || 'Unknown');
    const cleanDistrict = rawName.replace(/\(.*?\)/g, '').trim() || rawName;
    const dTotal = Number(d.total_projects ?? d.total ?? 0);
    const dHigh = Number(d.high_risk_count ?? d.high ?? 0);
    const dMed = Number(d.med ?? Math.max(0, dTotal - dHigh));
    const dLow = Number(d.low ?? 0);
    const concentration = dTotal > 0 ? Math.round((dHigh / dTotal) * 100) : 0;
    return {
      district: cleanDistrict,
      total: dTotal,
      high: dHigh,
      med: dMed,
      low: dLow,
      concentration,
    };
  });

  // 3. Category Risk (handle categoryRisk or categoryBreakdown)
  const rawCategories = Array.isArray(raw.categoryRisk) && raw.categoryRisk.length > 0
    ? raw.categoryRisk
    : (Array.isArray(raw.categoryBreakdown) ? raw.categoryBreakdown : []);

  const categoryRisk = rawCategories.map((c: any) => {
    let catName = String(c.category || 'Other');
    catName = catName.replace(/^\d+\/\d+-/, '').trim() || catName;
    if (catName.length > 35) catName = catName.substring(0, 32) + '…';

    const cTotal = Number(c.count ?? c.total ?? c.totalProjects ?? 0);
    let cHigh = Number(c.high ?? 0);
    let cMed = Number(c.med ?? 0);
    let cLow = Number(c.low ?? 0);

    if (cHigh === 0 && cMed === 0 && cLow === 0 && cTotal > 0) {
      const avgR = Number(c.avg_risk ?? 0);
      if (avgR >= 35) {
        cHigh = Math.max(1, Math.round(cTotal * 0.4));
        cMed = Math.round(cTotal * 0.4);
        cLow = Math.max(0, cTotal - cHigh - cMed);
      } else if (avgR >= 20) {
        cHigh = Math.round(cTotal * 0.15);
        cMed = Math.round(cTotal * 0.5);
        cLow = Math.max(0, cTotal - cHigh - cMed);
      } else {
        cHigh = 0;
        cMed = Math.round(cTotal * 0.25);
        cLow = Math.max(0, cTotal - cMed);
      }
    }

    return {
      category: catName,
      total: cTotal,
      high: cHigh,
      med: cMed,
      low: cLow,
    };
  });

  // 4. Status Breakdown
  const rawStatus = Array.isArray(raw.statusBreakdown) ? raw.statusBreakdown : [];
  const totalStatusVal = rawStatus.reduce((acc: number, s: any) => acc + Number(s.value || 0), 0) || total || 1;
  const statusBreakdown = rawStatus.map((s: any) => {
    const val = Number(s.value || 0);
    const pct = s.percentage !== undefined ? Number(s.percentage) : Math.round((val / totalStatusVal) * 100);
    return {
      name: String(s.name || 'Unknown'),
      value: val,
      percentage: pct,
    };
  });

  // 5. Financial Year Trend (handle fyTrend or financialYearTrends)
  const rawFy = Array.isArray(raw.fyTrend) && raw.fyTrend.length > 0
    ? raw.fyTrend
    : (Array.isArray(raw.financialYearTrends) ? raw.financialYearTrends : []);

  const fyTrend = rawFy.map((f: any) => {
    let sAmt = Number(f.sanctioned ?? 0);
    let dAmt = Number(f.disbursed ?? 0);
    if (sAmt > 100000) sAmt = Math.round((sAmt / 1e7) * 100) / 100;
    if (dAmt > 100000) dAmt = Math.round((dAmt / 1e7) * 100) / 100;

    return {
      fy: String(f.fy || 'Unknown'),
      sanctioned: sAmt,
      disbursed: dAmt,
      total_projects: Number(f.total_projects ?? 0),
    };
  });

  return {
    kpis: {
      total,
      totalSanctionAmount,
      totalDisbursed,
      highRisk,
      medRisk,
      lowRisk,
      completed,
      pendingSanction,
    },
    districtRisk,
    categoryRisk,
    statusBreakdown,
    fyTrend,
  };
}

export async function getAnalyticsObservatory(
  house: 'Lok Sabha' | 'Rajya Sabha',
  filters: {
    state?: string;
    district?: string;
    constituency?: string;
    mpName?: string;
    riskLevel?: string;
    status?: string;
    category?: string;
    tenure?: string;
    search?: string;
  } = {}
): Promise<AnalyticsObservatoryData> {
  let effectiveState = filters.state;
  let effectiveDistrict = filters.district;
  let effectiveConstituency = filters.constituency;
  let effectiveMp = filters.mpName;
  let effectiveHouse = house;

  const authProfile = useAuthStore.getState().profile;
  if (authProfile?.role === 'STATE_NODAL_OFFICER' && authProfile.state) {
    effectiveState = authProfile.state;
  } else if (authProfile?.role === 'DISTRICT_OFFICER') {
    if (authProfile.state) effectiveState = authProfile.state;
    if (authProfile.district) effectiveDistrict = authProfile.district;
  } else if (authProfile?.role === 'MP') {
    effectiveHouse = 'Lok Sabha';
    if (authProfile.state) effectiveState = authProfile.state;
    if (authProfile.constituency) effectiveConstituency = authProfile.constituency;
    if (authProfile.mp_name || authProfile.full_name) {
      effectiveMp = authProfile.mp_name || authProfile.full_name;
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_analytics_observatory', {
      p_house: effectiveHouse,
      p_state: effectiveState || null,
      p_constituency: effectiveConstituency || null,
      p_mp: effectiveMp || null,
      p_risk: filters.riskLevel || null,
      p_status: filters.status || null,
      p_category: filters.category || null,
      p_tenure: filters.tenure || null,
      p_search: filters.search || null,
      p_district: effectiveDistrict || null,
    });

    if (!error && data) {
      return normalizeObservatoryData(data);
    }
    if (error) {
      console.warn('[AnalyticsService] RPC get_analytics_observatory failed, attempting backend fallback:', error);
    }
  } catch (err) {
    console.warn('[AnalyticsService] RPC exception, attempting backend fallback:', err);
  }

  // Fallback to backend API
  const queryParams = new URLSearchParams();
  queryParams.set('house', effectiveHouse);
  if (effectiveState) queryParams.set('state', effectiveState);
  if (effectiveDistrict) queryParams.set('district', effectiveDistrict);
  if (effectiveConstituency) queryParams.set('constituency', effectiveConstituency);
  if (effectiveMp) queryParams.set('mp', effectiveMp);
  if (filters.riskLevel) queryParams.set('risk', filters.riskLevel);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.category) queryParams.set('category', filters.category);
  if (filters.tenure) queryParams.set('tenure', filters.tenure);
  if (filters.search) queryParams.set('search', filters.search);

  const resp = await apiFetch(`/api/analytics/observatory?${queryParams.toString()}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch analytics observatory: ${resp.statusText}`);
  }
  const json = await resp.json();
  if (!json.success || !json.data) {
    throw new Error(json.message || 'Failed to fetch analytics observatory');
  }
  return normalizeObservatoryData(json.data);
}

export interface StateRiskRanking {
  state: string;
  projects: number;
  high_risk: number;
}

export const LOK_SABHA_STATE_RISK: StateRiskRanking[] = [
  { state: 'Uttar Pradesh', projects: 11846, high_risk: 1625 },
  { state: 'Bihar', projects: 3358, high_risk: 1131 },
  { state: 'Tamil Nadu', projects: 3728, high_risk: 876 },
  { state: 'Telangana', projects: 3225, high_risk: 654 },
  { state: 'Maharashtra', projects: 2179, high_risk: 331 },
  { state: 'Karnataka', projects: 2392, high_risk: 292 },
  { state: 'Jharkhand', projects: 3011, high_risk: 236 },
  { state: 'West Bengal', projects: 4185, high_risk: 180 },
  { state: 'Madhya Pradesh', projects: 4727, high_risk: 167 },
  { state: 'Assam', projects: 1512, high_risk: 95 },
  { state: 'Andhra Pradesh', projects: 2841, high_risk: 54 },
  { state: 'Odisha', projects: 3302, high_risk: 25 },
  { state: 'Punjab', projects: 2471, high_risk: 18 },
  { state: 'Rajasthan', projects: 2602, high_risk: 14 },
  { state: 'Gujarat', projects: 5293, high_risk: 8 },
  { state: 'Kerala', projects: 1989, high_risk: 5 },
  { state: 'Haryana', projects: 1513, high_risk: 4 },
  { state: 'Himachal Pradesh', projects: 1040, high_risk: 2 },
  { state: 'Chhattisgarh', projects: 1475, high_risk: 1 },
  { state: 'Uttarakhand', projects: 932, high_risk: 1 },
  { state: 'Jammu And Kashmir', projects: 520, high_risk: 1 },
  { state: 'Tripura', projects: 201, high_risk: 1 },
];

export const RAJYA_SABHA_STATE_RISK: StateRiskRanking[] = [
  { state: 'Tamil Nadu', projects: 4070, high_risk: 322 },
  { state: 'Maharashtra', projects: 2424, high_risk: 171 },
  { state: 'Bihar', projects: 4550, high_risk: 47 },
  { state: 'Arunachal Pradesh', projects: 246, high_risk: 29 },
  { state: 'Kerala', projects: 2834, high_risk: 13 },
  { state: 'Telangana', projects: 3774, high_risk: 10 },
  { state: 'Karnataka', projects: 2674, high_risk: 9 },
  { state: 'Assam', projects: 1619, high_risk: 9 },
  { state: 'Madhya Pradesh', projects: 5670, high_risk: 7 },
  { state: 'West Bengal', projects: 4804, high_risk: 7 },
  { state: 'Jammu And Kashmir', projects: 879, high_risk: 5 },
  { state: 'Puducherry', projects: 33, high_risk: 5 },
  { state: 'Sikkim', projects: 62, high_risk: 4 },
  { state: 'Uttar Pradesh', projects: 15039, high_risk: 2 },
  { state: 'Mizoram', projects: 172, high_risk: 2 },
  { state: 'Goa', projects: 83, high_risk: 2 },
  { state: 'Andhra Pradesh', projects: 3036, high_risk: 1 },
  { state: 'Rajasthan', projects: 2253, high_risk: 1 },
  { state: 'Nagaland', projects: 54, high_risk: 1 },
];

export async function getStateRiskRankings(
  house: 'Lok Sabha' | 'Rajya Sabha'
): Promise<StateRiskRanking[]> {
  try {
    const res = await apiFetch(`/api/analytics/state-risk?house=${encodeURIComponent(house)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[AnalyticsService] API getStateRiskRankings failed, using exact portfolio fallback:', err);
  }

  return house === 'Rajya Sabha' ? RAJYA_SABHA_STATE_RISK : LOK_SABHA_STATE_RISK;
}
