// projectService.ts — queries Supabase directly (no backend required)
import type { EnrichedProject, RiskLevel, WorkStatus, PaymentStatus, VerificationStatus } from '../types';
import { getRiskLevel } from '../utils/risk';
import { loadVerificationOverrides, saveVerificationOverride } from '../utils/verificationStorage';
import { supabase } from './client';
import { useAuthStore } from '../store/authStore';

export interface ProjectQueryParams {
  house: 'Lok Sabha' | 'Rajya Sabha';
  page?: number;
  pageSize?: number;
  search?: string;
  state?: string;
  district?: string;
  constituency?: string;
  mpName?: string;
  riskLevel?: string;
  status?: string;
  category?: string;
  tenure?: string;
  isSanctioned?: boolean;
  isCompleted?: boolean;
  hasDisbursement?: boolean;
  sortField?: 'risk' | 'amount' | 'district' | 'status' | 'fy';
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedProjectsResult {
  projects: EnrichedProject[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function rowToEnrichedProject(row: any): EnrichedProject {
  return {
    workId: row.work_id,
    srNo: row.sr_no || '',
    workCategory: row.work_category || '',
    state: row.state || '',
    ida: row.ida || '',
    district: row.district || '',
    mp: row.mp_name || '',
    constituency: row.constituency || '',
    workDescription: row.work_description || '',
    financialYear: row.financial_year || '',
    house: (row.house as 'Lok Sabha' | 'Rajya Sabha') || 'Lok Sabha',

    recommendedDate: row.recommended_date ? new Date(row.recommended_date) : null,
    sanctionDate: row.sanction_date ? new Date(row.sanction_date) : null,
    completionDate: row.completion_date ? new Date(row.completion_date) : null,
    expenditureDate: row.expenditure_date ? new Date(row.expenditure_date) : null,

    sanctionAmount: row.sanction_amount !== null ? Number(row.sanction_amount) : null,
    recommendedAmount: row.recommended_amount !== null ? Number(row.recommended_amount) : null,
    amountDisbursed: row.amount_disbursed !== null ? Number(row.amount_disbursed) : null,
    expenditureAmount: row.expenditure_amount !== null ? Number(row.expenditure_amount) : null,
    totalPaid: row.total_paid !== null ? Number(row.total_paid) : null,
    allocatedLimit: row.allocated_limit !== null ? Number(row.allocated_limit) : null,
    disbursementRatio: row.disbursement_ratio !== null ? Number(row.disbursement_ratio) : null,

    workStatus: (row.work_status as WorkStatus) || 'Unknown',
    paymentStatus: (row.payment_status as PaymentStatus) || 'Unknown',
    isCompleted: !!row.is_completed,
    isSanctioned: !!row.is_sanctioned,
    isRecommendedOnly: !!row.is_recommended_only,

    daysSinceSanction: row.days_since_sanction !== null ? Number(row.days_since_sanction) : null,
    daysSinceRecommendation: row.days_since_recommendation !== null ? Number(row.days_since_recommendation) : null,
    daysToComplete: row.days_to_complete !== null ? Number(row.days_to_complete) : null,
    vendorName: row.vendor_name || null,

    risk: (() => {
      const daysSinceSanction = row.days_since_sanction !== null ? Number(row.days_since_sanction) : null;
      const sanctionAmount = row.sanction_amount !== null ? Number(row.sanction_amount) : null;
      const totalPaid = row.total_paid !== null ? Number(row.total_paid) : null;
      const workStatus = row.work_status || 'Unknown';
      const isCompleted = !!row.is_completed;

      let computedFactors = Array.isArray(row.risk_factors) && row.risk_factors.length > 0 ? row.risk_factors : [];
      if (computedFactors.length === 0) {
        computedFactors = [
          { name: 'Completion Status', score: isCompleted ? 0 : 40, available: true, description: isCompleted ? 'Work completed' : 'Work not completed' },
          { name: 'Disbursement Delay', score: (daysSinceSanction && daysSinceSanction > 365) ? 30 : 0, available: daysSinceSanction !== null, description: daysSinceSanction && daysSinceSanction > 365 ? `${daysSinceSanction} days since sanction` : 'Within acceptable limits' },
          { name: 'Payment Ratio', score: (totalPaid !== null && sanctionAmount !== null && sanctionAmount > 0 && totalPaid / sanctionAmount < 0.3) ? 25 : 0, available: totalPaid !== null && sanctionAmount !== null, description: 'Expenditure vs sanction analysis' },
        ];
      }

      const primaryFactor = computedFactors.find((f: any) => f.score > 0);
      const explanation = row.risk_explanation || (primaryFactor ? primaryFactor.description : 'Standard progress monitoring parameters applied.');

      return {
        score: Number(row.risk_score || 0),
        level: (row.risk_level as RiskLevel) || getRiskLevel(Number(row.risk_score || 0)),
        factors: computedFactors,
        explanation,
        factorsAvailable: computedFactors.filter((f: any) => f.available).length,
        factorsTotal: computedFactors.length,
      };
    })(),

    verificationStatus: (row.verification_status as VerificationStatus) || 'New Alert',
    verificationHistory: Array.isArray(row.verification_history) ? row.verification_history : [],
  };
}

// ── Main query: directly from Supabase ────────────────────────────────────────

export async function getProjects(params: ProjectQueryParams): Promise<PaginatedProjectsResult> {
  const table = params.house === 'Rajya Sabha' ? 'rajya_sabha_projects' : 'lok_sabha_projects';
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 100, 500);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build Supabase query
  let query = supabase
    .from(table as 'lok_sabha_projects')
    .select('*', { count: 'exact' });

  // Filters
  if (params.search && params.search.trim()) {
    const s = params.search.trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s) {
      query = query.or(
        `work_description.ilike.%${s}%,mp_name.ilike.%${s}%,work_id.ilike.%${s}%,district.ilike.%${s}%`
      );
    }
  }

  // Strict Role Data Scope Enforcement
  const authProfile = useAuthStore.getState().profile;
  if (authProfile?.role === 'STATE_NODAL_OFFICER' && authProfile.state) {
    const assignedState = authProfile.state;
    if (params.state && params.state.trim().toLowerCase() !== assignedState.trim().toLowerCase()) {
      throw new Error(`Access Denied: You are not authorized to view projects outside your assigned state (${assignedState}).`);
    }
    query = query.eq('state', assignedState);
  } else if (authProfile?.role === 'DISTRICT_OFFICER') {
    if (authProfile.state) {
      query = query.eq('state', authProfile.state);
    }
    if (authProfile.district) {
      const cleanD = authProfile.district.split('(')[0].trim();
      query = query.ilike('district', `${cleanD}%`);
    }
  } else if (authProfile?.role === 'MP') {
    if (authProfile.constituency) {
      query = query.eq('constituency', authProfile.constituency);
    }
    if (authProfile.state) {
      query = query.eq('state', authProfile.state);
    }
    if (authProfile.mp_name || authProfile.full_name) {
      const mName = (authProfile.mp_name || authProfile.full_name).trim();
      query = query.ilike('mp_name', `%${mName}%`);
    }
  } else if (authProfile?.role === 'IMPLEMENTING_AGENCY') {
    if (authProfile.agency_name) {
      const cleanAgency = authProfile.agency_name.split('(')[0].trim();
      query = query.ilike('ida', `%${cleanAgency}%`);
    }
  } else if (params.state) {
    query = query.eq('state', params.state);
  }

  if (authProfile?.role !== 'DISTRICT_OFFICER' && params.district) {
    query = query.eq('district', params.district);
  }
  if (params.house === 'Lok Sabha' && params.constituency) {
    query = query.eq('constituency', params.constituency);
  }
  if (params.mpName)       query = query.ilike('mp_name', `%${params.mpName}%`);
  if (params.riskLevel)    query = query.eq('risk_level', params.riskLevel);
  if (params.status)       query = query.eq('work_status', params.status);
  if (params.category)     query = query.eq('work_category', params.category);
  if (params.isSanctioned !== undefined) query = query.eq('is_sanctioned', params.isSanctioned);
  if (params.isCompleted !== undefined)  query = query.eq('is_completed', params.isCompleted);

  // Sort
  const sortColumnMap: Record<string, string> = {
    risk: 'risk_score',
    amount: 'sanction_amount',
    district: 'district',
    status: 'work_status',
    fy: 'financial_year',
  };
  const sortCol = sortColumnMap[params.sortField || 'risk'] || 'risk_score';
  query = query.order(sortCol, { ascending: params.sortDir === 'asc' });

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[projectService] Supabase query error:', error);
    throw new Error(error.message);
  }

  const overrides = loadVerificationOverrides();
  const projects: EnrichedProject[] = (data || []).map((row: any) => {
    const p = rowToEnrichedProject(row);
    const override = overrides[p.workId];
    if (override) {
      p.verificationStatus = override.status;
      p.verificationHistory = override.history;
    }
    return p;
  });

  const totalCount = count || 0;
  return {
    projects,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getProjectById(
  workId: string,
  house: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha'
): Promise<EnrichedProject | null> {
  try {
    const table = house === 'Rajya Sabha' ? 'rajya_sabha_projects' : 'lok_sabha_projects';
    let { data, error } = await supabase
      .from(table as 'lok_sabha_projects')
      .select('*')
      .eq('work_id', workId)
      .maybeSingle();

    if (!data) {
      const fallbackTable = house === 'Rajya Sabha' ? 'lok_sabha_projects' : 'rajya_sabha_projects';
      const fallbackRes = await supabase
        .from(fallbackTable as 'lok_sabha_projects')
        .select('*')
        .eq('work_id', workId)
        .maybeSingle();
      if (fallbackRes.data) {
        data = fallbackRes.data;
      }
    }

    if (!data) return null;

    const authProfile = useAuthStore.getState().profile;
    const p = rowToEnrichedProject(data);

    // Cross-State access restriction for State Nodal Officers
    if (authProfile?.role === 'STATE_NODAL_OFFICER' && authProfile.state) {
      if (p.state && p.state.trim().toLowerCase() !== authProfile.state.trim().toLowerCase()) {
        console.warn(`[projectService] Access Denied: State Nodal Officer (${authProfile.state}) denied access to project from ${p.state}`);
        return null;
      }
    }

    // Cross-District access restriction for District Officers
    if (authProfile?.role === 'DISTRICT_OFFICER') {
      if (authProfile.state && p.state && p.state.trim().toLowerCase() !== authProfile.state.trim().toLowerCase()) {
        console.warn(`[projectService] Access Denied: District Officer (${authProfile.state}) denied access to project from ${p.state}`);
        return null;
      }
      if (authProfile.district && p.district) {
        const cleanD = authProfile.district.split('(')[0].trim().toLowerCase();
        const pDist = p.district.split('(')[0].trim().toLowerCase();
        const isMatch = pDist.includes(cleanD) || cleanD.includes(pDist) || p.district.toLowerCase().includes(cleanD);
        if (!isMatch) {
          console.warn(`[projectService] Access Denied: District Officer (${authProfile.district}) denied access to project from ${p.district}`);
          return null;
        }
      }
    }

    const overrides = loadVerificationOverrides();
    const override = overrides[p.workId];
    if (override) {
      p.verificationStatus = override.status;
      p.verificationHistory = override.history;
    }
    return p;
  } catch (err) {
    console.error('[projectService] getProjectById error:', err);
    return null;
  }
}

export interface StateNodalOverview {
  state: string;
  house: 'Lok Sabha' | 'Rajya Sabha';
  kpis: {
    total: number;
    totalSanctionAmount: number;
    totalDisbursed: number;
    completed: number;
    highRisk: number;
    medRisk: number;
    lowRisk: number;
    requiresVerification: number;
    avgRiskScore: number;
  };
  districts: Array<{
    district: string;
    total: number;
    sanctioned: number;
    disbursed: number;
    high_risk: number;
    completed: number;
  }>;
  constituencies: Array<{
    constituency: string;
    mp_name: string;
    total: number;
    sanctioned: number;
    high_risk: number;
  }>;
  mps: Array<{
    mp_name: string;
    total: number;
    sanctioned: number;
    disbursed: number;
    high_risk: number;
  }>;
  priorityQueue: Array<{
    work_id: string;
    work_description: string;
    district: string;
    constituency?: string;
    mp_name: string;
    sanction_amount: number;
    total_paid: number;
    risk_score: number;
    risk_level: string;
    verification_status: string;
  }>;
}

export async function getStateNodalOverview(
  house: 'Lok Sabha' | 'Rajya Sabha',
  state?: string
): Promise<StateNodalOverview> {
  const authProfile = useAuthStore.getState().profile;
  const effectiveState = (authProfile?.role === 'STATE_NODAL_OFFICER' && authProfile.state)
    ? authProfile.state
    : (state || 'Tamil Nadu');

  const { data, error } = await supabase.rpc('get_state_nodal_overview', {
    p_house: house,
    p_state: effectiveState,
  });

  if (error) {
    console.error('[projectService] Error in getStateNodalOverview:', error);
    throw error;
  }

  return data as StateNodalOverview;
}

export interface DistrictOfficerOverview {
  state: string;
  district: string;
  cleanDistrict: string;
  house: 'Lok Sabha' | 'Rajya Sabha';
  kpis: {
    total: number;
    totalSanctionAmount: number;
    totalDisbursed: number;
    completed: number;
    highRisk: number;
    medRisk: number;
    lowRisk: number;
    pendingSanction: number;
    requiresVerification: number;
    staleCount: number;
    costAnomalies: number;
    disbAnomalies: number;
    avgRiskScore: number;
  };
  constituencies: Array<{
    constituency: string;
    mp_name: string;
    total: number;
    sanctioned: number;
    disbursed: number;
    completed: number;
    high_risk: number;
    avg_risk: number;
  }>;
  mps: Array<{
    mp_name: string;
    total: number;
    sanctioned: number;
    disbursed: number;
    completed: number;
    high_risk: number;
    avg_risk: number;
  }>;
  priorityQueue: Array<{
    work_id: string;
    work_description: string;
    constituency?: string;
    mp_name: string;
    sanction_amount: number;
    total_paid: number;
    disbursement_ratio: number;
    risk_score: number;
    risk_level: string;
    risk_explanation: string;
    days_since_sanction: number;
    work_status: string;
    verification_status: string;
    vendor_name?: string;
  }>;
}

export async function getDistrictOfficerOverview(
  house: 'Lok Sabha' | 'Rajya Sabha',
  state?: string,
  district?: string
): Promise<DistrictOfficerOverview> {
  const authProfile = useAuthStore.getState().profile;
  const effectiveState = (authProfile?.role === 'DISTRICT_OFFICER' && authProfile.state)
    ? authProfile.state
    : (state || 'Uttar Pradesh');

  const effectiveDistrict = (authProfile?.role === 'DISTRICT_OFFICER' && authProfile.district)
    ? authProfile.district
    : (district || 'VARANASI');

  const { data, error } = await supabase.rpc('get_district_officer_overview', {
    p_house: house,
    p_state: effectiveState,
    p_district: effectiveDistrict,
  });

  if (error) {
    console.error('[projectService] Error in getDistrictOfficerOverview:', error);
    throw error;
  }

  return data as DistrictOfficerOverview;
}

export async function updateProjectVerification(
  workId: string,
  house: 'Lok Sabha' | 'Rajya Sabha',
  status: VerificationStatus,
  actor: string,
  comment?: string
): Promise<boolean> {
  const event = {
    timestamp: new Date().toISOString(),
    action: `Status updated to ${status}`,
    actor,
    comment,
  };
  saveVerificationOverride(workId, { status, history: [event] });
  return true;
}

export interface ProjectExecutionEvidenceItem {
  id: string;
  work_id: string;
  house: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  description?: string;
  file_size_bytes?: number;
  created_at: string;
  uploaded_by?: string;
  agency_name?: string;
}

export interface ProjectExecutionUpdateItem {
  id: string;
  work_id: string;
  house: string;
  physical_progress: number;
  milestone_status: string;
  update_date: string;
  remarks: string;
  delay_reason?: string;
  expected_completion_date?: string;
  review_status?: string;
  agency_name?: string;
  submitted_at: string;
}

export interface ProjectEvidenceAndUpdates {
  evidence: ProjectExecutionEvidenceItem[];
  updates: ProjectExecutionUpdateItem[];
}

export async function getProjectExecutionEvidence(
  workId: string,
  house: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha'
): Promise<ProjectEvidenceAndUpdates> {
  const cleanId = workId.trim();
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(cleanId)}/execution-details?house=${encodeURIComponent(house)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (_) {}

  try {
    const [evRes, upRes] = await Promise.all([
      supabase.from('execution_evidence').select('*').eq('work_id', cleanId).order('created_at', { ascending: false }),
      supabase.from('execution_updates').select('*').eq('work_id', cleanId).order('submitted_at', { ascending: false }),
    ]);

    return {
      evidence: (evRes.data || []) as ProjectExecutionEvidenceItem[],
      updates: (upRes.data || []) as ProjectExecutionUpdateItem[],
    };
  } catch (err) {
    console.warn('Could not fetch project execution evidence:', err);
    return { evidence: [], updates: [] };
  }
}

