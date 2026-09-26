import { supabase, getTableName } from './supabase.service.js';
import { getRiskLevel } from '../risk/riskEngine.js';
import type { EnrichedProject, ProjectFilters, RiskLevel, WorkStatus, PaymentStatus, VerificationStatus } from '../types/index.js';
import { RAJYA_SABHA_MPS, getRajyaSabhaMPsByState } from '../data/rajyaSabhaMPs.js';

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

    recommendedDate: row.recommended_date || null,
    sanctionDate: row.sanction_date || null,
    completionDate: row.completion_date || null,
    expenditureDate: row.expenditure_date || null,

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
        const staleSeverity = (!isCompleted && daysSinceSanction && daysSinceSanction > 730) ? 'HIGH' : (!isCompleted && daysSinceSanction && daysSinceSanction > 365) ? 'MEDIUM' : 'LOW';
        const staleScore = staleSeverity === 'HIGH' ? 60 : staleSeverity === 'MEDIUM' ? 35 : 10;

        const costSeverity = (sanctionAmount && sanctionAmount > 5000000) ? 'HIGH' : (sanctionAmount && sanctionAmount > 2500000) ? 'MEDIUM' : 'LOW';
        const costScore = costSeverity === 'HIGH' ? 60 : costSeverity === 'MEDIUM' ? 30 : 10;

        const ratio = (sanctionAmount && totalPaid) ? Math.round((totalPaid / sanctionAmount) * 100) : 0;
        const disbSeverity = (ratio > 95 && !isCompleted) ? 'HIGH' : (ratio > 80 && !isCompleted) ? 'MEDIUM' : 'LOW';
        const disbScore = disbSeverity === 'HIGH' ? 55 : disbSeverity === 'MEDIUM' ? 30 : 10;

        computedFactors = [
          {
            id: 'stale_status',
            label: 'Stale Implementation Phase',
            description: daysSinceSanction ? `In "${workStatus}" for ${daysSinceSanction} days without completion. Verification Recommended.` : `Status: ${workStatus}. Verification Recommended.`,
            severity: staleSeverity,
            score: staleScore,
            available: daysSinceSanction !== null && !isCompleted,
          },
          {
            id: 'high_amount_anomaly',
            label: 'Outlier Cost Allocation',
            description: sanctionAmount ? `Sanction allocation: ₹${sanctionAmount.toLocaleString('en-IN')}. Expenditure tracking recommended.` : 'Sanction amount not recorded.',
            severity: costSeverity,
            score: costScore,
            available: sanctionAmount !== null,
          },
          {
            id: 'disbursement_anomaly',
            label: 'Disbursement vs Progress Discrepancy',
            description: `${ratio}% of funds disbursed while work status is "${workStatus}". Site verification recommended.`,
            severity: disbSeverity,
            score: disbScore,
            available: sanctionAmount !== null && totalPaid !== null && !isCompleted,
          },
        ];
      }

      const primaryFactor = computedFactors.find((f: any) => f.available && (f.severity === 'HIGH' || f.severity === 'MEDIUM'));
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
  };
}

export async function fetchProjects(filters: ProjectFilters) {
  const house = filters.house || 'Lok Sabha';
  const tableName = getTableName(house);
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(filters.pageSize) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' });

  if (filters.state) {
    query = query.eq('state', filters.state);
  }
  if (filters.district) {
    query = query.eq('district', filters.district);
  }
  if (filters.constituency && house === 'Lok Sabha') {
    query = query.eq('constituency', filters.constituency);
  }
  if (filters.mpName) {
    if (house === 'Rajya Sabha') {
      const cleanName = filters.mpName.replace(/\s*\([^)]*\)/g, '').trim();
      const rsMp = RAJYA_SABHA_MPS.find(m => m.name === filters.mpName || m.cleanName === cleanName);
      if (rsMp && rsMp.state) {
        query = query.or(`mp_name.ilike.%${cleanName}%,state.eq.${rsMp.state}`);
      } else {
        query = query.ilike('mp_name', `%${cleanName}%`);
      }
    } else {
      query = query.ilike('mp_name', `%${filters.mpName}%`);
    }
  }
  if (filters.workCategory) {
    query = query.eq('work_category', filters.workCategory);
  }
  if (filters.status) {
    query = query.eq('work_status', filters.status);
  }
  if (filters.financialYear) {
    query = query.eq('financial_year', filters.financialYear);
  }
  if (filters.tenure && filters.tenure !== 'All Tenures' && filters.tenure.trim() !== '') {
    if (filters.tenure === '18th Lok Sabha') {
      query = query.or('financial_year.gte.2024-2025,financial_year.eq.Unknown');
    } else if (filters.tenure === '17th Lok Sabha') {
      query = query.gte('financial_year', '2019-2020').lte('financial_year', '2023-2024');
    }
  }
  if (filters.riskLevel) {
    query = query.eq('risk_level', filters.riskLevel);
  }
  if (filters.isSanctioned !== undefined) {
    query = query.eq('is_sanctioned', filters.isSanctioned);
  }
  if (filters.isCompleted !== undefined) {
    query = query.eq('is_completed', filters.isCompleted);
  }
  if (filters.hasDisbursement) {
    query = query.gt('total_paid', 0);
  }
  if (filters.search) {
    const s = filters.search.trim();
    if (house === 'Lok Sabha') {
      query = query.or(`work_id.ilike.%${s}%,work_description.ilike.%${s}%,mp_name.ilike.%${s}%,district.ilike.%${s}%,constituency.ilike.%${s}%`);
    } else {
      query = query.or(`work_id.ilike.%${s}%,work_description.ilike.%${s}%,mp_name.ilike.%${s}%,district.ilike.%${s}%`);
    }
  }

  let sortField = filters.sortBy || 'sanction_amount';
  if (sortField === 'risk') sortField = 'risk_score';
  else if (sortField === 'amount') sortField = 'sanction_amount';
  else if (sortField === 'status') sortField = 'work_status';
  else if (sortField === 'fy') sortField = 'financial_year';

  const sortAsc = filters.sortOrder === 'asc';
  query = query
    .order(sortField, { ascending: sortAsc })
    .order('work_id', { ascending: true })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Database error fetching projects: ${error.message}`);
  }

  const totalCount = count || 0;
  const projects = (data || []).map(rowToEnrichedProject);

  return {
    projects,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function fetchProjectById(workId: string, house: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha') {
  const tableName = getTableName(house);
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('work_id', workId)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToEnrichedProject(data);
}

export async function fetchFilterOptions(house: 'Lok Sabha' | 'Rajya Sabha' = 'Lok Sabha', state?: string) {
  if (house === 'Rajya Sabha') {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_filter_options', {
        p_house: 'Rajya Sabha',
        p_state: state || null,
      });
      if (!rpcError && rpcData) {
        return rpcData;
      }
    } catch {
      // Fall back
    }
    return {
      states: [],
      districts: [],
      constituencies: [],
      mps: getRajyaSabhaMPsByState(state),
      categories: [],
      years: [],
      statuses: [],
    };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_filter_options', {
      p_house: house,
      p_state: state || null,
    });
    if (!rpcError && rpcData) {
      return rpcData;
    }
  } catch {
    // Fall back to table sampling if RPC is unavailable
  }

  const tableName = getTableName(house);
  const { data, error } = await supabase
    .from(tableName)
    .select('state, district, constituency, work_category, financial_year, work_status')
    .limit(3000);

  if (error || !data) {
    return { states: [], districts: [], constituencies: [], categories: [], years: [], statuses: [] };
  }

  const states = Array.from(new Set(data.map(d => d.state).filter(Boolean))).sort();
  const districts = Array.from(new Set(data.map(d => d.district).filter(Boolean))).sort();
  const constituencies = Array.from(new Set(data.map(d => d.constituency).filter(Boolean))).sort();
  const categories = Array.from(new Set(data.map(d => d.work_category).filter(Boolean))).sort();
  const years = Array.from(new Set(data.map(d => d.financial_year).filter(Boolean))).sort();
  const statuses = Array.from(new Set(data.map(d => d.work_status).filter(Boolean))).sort();

  return { states, districts, constituencies, categories, years, statuses };
}

export async function fetchProjectExecutionDetails(workId: string, house: string = 'Lok Sabha') {
  const cleanId = workId.trim();
  const [evidenceRes, updatesRes] = await Promise.all([
    supabase
      .from('execution_evidence')
      .select('*')
      .eq('work_id', cleanId)
      .order('created_at', { ascending: false }),
    supabase
      .from('execution_updates')
      .select('*')
      .eq('work_id', cleanId)
      .order('submitted_at', { ascending: false }),
  ]);

  return {
    evidence: evidenceRes.data || [],
    updates: updatesRes.data || [],
  };
}

