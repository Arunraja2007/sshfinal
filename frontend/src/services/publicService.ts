import type {
  PublicMpsResponse,
  PublicMpProfileResponse,
  PublicProjectsResponse,
  PublicProjectDetailResponse,
  PublicKpisResponse,
  PublicMetaResponse,
  PublicComplaintSubmission,
  PublicComplaintSubmitResult,
  PublicComplaintTrackingResult,
  DistrictComplaintItem,
  ComplaintEvent,
  AgencyComplaintItem,
  AuditorComplaintItem,
  StateEscalatedComplaintItem,
} from '../types/public';


const API_BASE = '/api/public';

export class PublicService {
  /**
   * Fetch paginated MP directory
   */
  static async getMps(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    state?: string;
    constituency?: string;
  } = {}): Promise<PublicMpsResponse> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.search) q.set('search', params.search);
    if (params.state && params.state !== 'ALL') q.set('state', params.state);
    if (params.constituency && params.constituency !== 'ALL') q.set('constituency', params.constituency);

    const res = await fetch(`${API_BASE}/mps?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load MP directory');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch individual public MP profile dossier
   */
  static async getMpProfile(mpId: string): Promise<PublicMpProfileResponse> {
    const res = await fetch(`${API_BASE}/mps/${encodeURIComponent(mpId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load MP profile');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch paginated public projects
   */
  static async getProjects(params: {
    page?: number;
    pageSize?: number;
    state?: string;
    district?: string;
    constituency?: string;
    mpName?: string;
    category?: string;
    financialYear?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<PublicProjectsResponse> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.state && params.state !== 'ALL') q.set('state', params.state);
    if (params.district && params.district !== 'ALL') q.set('district', params.district);
    if (params.constituency && params.constituency !== 'ALL') q.set('constituency', params.constituency);
    if (params.mpName && params.mpName !== 'ALL') q.set('mpName', params.mpName);
    if (params.category && params.category !== 'ALL') q.set('category', params.category);
    if (params.financialYear && params.financialYear !== 'ALL') q.set('financialYear', params.financialYear);
    if (params.status && params.status !== 'ALL') q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.sortOrder) q.set('sortOrder', params.sortOrder);

    const res = await fetch(`${API_BASE}/projects?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load public projects');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch individual public project detail dossier
   */
  static async getProjectDetail(workId: string): Promise<PublicProjectDetailResponse> {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(workId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch project detail for ${workId}`);
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch public macro KPIs
   */
  static async getKpis(): Promise<PublicKpisResponse> {
    const res = await fetch(`${API_BASE}/kpis`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load macro KPIs');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch public analytics observatory
   */
  static async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load public analytics');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch dataset transparency metadata
   */
  static async getMeta(): Promise<PublicMetaResponse> {
    const res = await fetch(`${API_BASE}/meta`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load metadata');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Submit a public complaint / grievance
   */
  static async submitComplaint(payload: PublicComplaintSubmission): Promise<PublicComplaintSubmitResult> {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit grievance');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Track an existing complaint by Complaint ID and verification value
   */
  static async trackComplaint(
    complaintId: string,
    verificationValue: string
  ): Promise<PublicComplaintTrackingResult> {
    const res = await fetch(`${API_BASE}/complaints/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ complaintId, verificationValue }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Verification failed for tracking');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch all complaints assigned to a district for District Officer review
   */
  static async getDistrictComplaints(district: string, state?: string): Promise<DistrictComplaintItem[]> {
    const params = new URLSearchParams({ district });
    if (state) params.append('state', state);
    const res = await fetch(`${API_BASE}/complaints/district?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch district complaints');
    }
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Update complaint review status and response remarks by District Officer
   */
  static async updateComplaintStatus(
    complaintId: string,
    payload: {
      status?: string;
      publicResponse?: string;
      internalNotes?: string;
      assignedOfficer?: string;
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update complaint status');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Submit citizen clarification
   */
  static async submitClarification(
    complaintId: string,
    verificationValue: string,
    clarificationText: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/clarify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verificationValue, clarificationText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit clarification');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch timeline events for a complaint
   */
  static async getComplaintTimeline(complaintId: string, publicOnly = true): Promise<ComplaintEvent[]> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/events?publicOnly=${publicOnly}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch complaint timeline');
    }
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Execute structured District Officer workflow action
   */
  static async executeOfficerAction(
    complaintId: string,
    action: string,
    payload: {
      remarks?: string;
      publicResponse?: string;
      internalNotes?: string;
      assignedAgency?: string;
      status?: string;
      officerName?: string;
      evidence?: {
        fileName: string;
        fileType?: string;
        fileSize?: number;
        fileData?: string;
        storagePath?: string;
        description?: string;
      };
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to execute action ${action}`);
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch complaint requests for Implementing Agency
   */
  static async getAgencyComplaintRequests(agencyName?: string, district?: string, status?: string): Promise<AgencyComplaintItem[]> {
    const params = new URLSearchParams();
    if (agencyName) params.append('agencyName', agencyName);
    if (district) params.append('district', district);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/complaints/agency?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch agency complaint requests');
    }
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Submit Implementing Agency execution response
   */
  static async submitAgencyResponse(
    complaintId: string,
    payload: { remarks: string; progress?: number; agencyName?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/agency-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit agency response');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch complaints requiring Auditor verification
   */
  static async getAuditorVerificationComplaints(): Promise<AuditorComplaintItem[]> {
    const res = await fetch(`${API_BASE}/complaints/auditor`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch auditor complaints');
    }
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Submit Auditor verification finding
   */
  static async submitAuditorFinding(
    complaintId: string,
    payload: { outcome: string; remarks: string; auditorName?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/auditor-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit auditor finding');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Fetch escalated complaints for State Nodal Officer
   */
  static async getStateEscalatedComplaints(state?: string): Promise<StateEscalatedComplaintItem[]> {
    const params = new URLSearchParams();
    if (state && state !== 'ALL') params.append('state', state);
    const res = await fetch(`${API_BASE}/complaints/state?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch state escalated complaints');
    }
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Submit State Nodal administrative direction
   */
  static async submitStateNodalDirection(
    complaintId: string,
    payload: { direction: string; officerName?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/state-direction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit state nodal direction');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Attach inspection or supporting evidence document to a complaint or work dossier
   */
  static async attachEvidence(
    complaintId: string,
    payload: {
      fileName: string;
      fileType: string;
      fileSize?: number;
      storagePath?: string;
      description?: string;
      uploadedBy?: string;
      uploaderRole?: string;
    }
  ): Promise<any> {
    const item = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      complaintId,
      fileName: payload.fileName,
      fileType: payload.fileType,
      fileSize: payload.fileSize || 0,
      storagePath: payload.storagePath || '',
      description: payload.description || '',
      uploadedBy: payload.uploadedBy || 'Citizen Complainant',
      uploaderRole: payload.uploaderRole || 'Citizen',
      createdAt: new Date().toISOString(),
    };

    // Store in browser local storage as immediate resilient cache
    try {
      const cacheKey = `evidence_store_${complaintId}`;
      const existingStr = localStorage.getItem(cacheKey);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(item);
      localStorage.setItem(cacheKey, JSON.stringify(existing));
    } catch (lsErr) {
      console.warn('[PublicService] localStorage cache save error:', lsErr);
    }

    try {
      const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || item;
      }
    } catch (apiErr) {
      console.warn('[PublicService] Backend evidence API unavailable, using local store:', apiErr);
    }

    return item;
  }

  /**
   * Fetch all attached evidence documents for a complaint
   */
  static async getEvidence(complaintId: string): Promise<any[]> {
    let localItems: any[] = [];
    try {
      const cacheKey = `evidence_store_${complaintId}`;
      const existingStr = localStorage.getItem(cacheKey);
      if (existingStr) {
        localItems = JSON.parse(existingStr);
      }
    } catch (e) {
      // Ignore
    }

    try {
      const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/evidence`);
      if (res.ok) {
        const json = await res.json();
        const serverItems = json.data || [];
        // Merge without duplicates based on storagePath / fileName + createdAt
        const merged = [...serverItems];
        for (const loc of localItems) {
          if (!merged.some(m => m.id === loc.id || (m.fileName === loc.fileName && m.fileSize === loc.fileSize))) {
            merged.push(loc);
          }
        }
        return merged;
      }
    } catch (err) {
      console.warn('[PublicService] Fetch evidence error, returning local cache:', err);
    }

    return localItems;
  }
}


