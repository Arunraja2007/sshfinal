export interface PublicMpItem {
  id: string;
  mpId: string;
  name: string;
  fullName: string;
  party: string;
  constituency: string;
  state: string;
  house: 'Lok Sabha';
  photoUrl: string | null;
}

export interface PublicMpsResponse {
  mps: PublicMpItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicAttentionIndicator {
  level: 'NONE' | 'ATTENTION' | 'REVIEW';
  label: string;
  reason?: string;
}

export interface PublicMpProfileResponse {
  mpInfo: {
    fullName: string;
    mpName: string;
    party: string;
    constituency: string;
    state: string;
    house: 'Lok Sabha';
    mpId: string;
    photoUrl: string | null;
    tenure: string;
  };
  portfolioSummary: {
    totalWorks: number;
    totalSanctioned: number;
    totalDisbursed: number;
    completedCount: number;
    ongoingCount: number;
    pendingCount: number;
    avgProgress: number;
    attentionCount: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
    sanctioned: number;
    completed: number;
    ongoing: number;
  }>;
  districtBreakdown: Array<{
    district: string;
    count: number;
    sanctioned: number;
    disbursed: number;
    completed: number;
  }>;
  attentionItems: Array<{
    workId: string;
    workDescription: string;
    sanctionAmount: number;
    totalPaid: number;
    indicatorLevel: 'NONE' | 'ATTENTION' | 'REVIEW';
    indicatorLabel: string;
    explanation?: string;
  }>;
  recentWorks: Array<{
    workId: string;
    workDescription: string;
    workCategory: string;
    financialYear: string;
    sanctionAmount: number;
    amountDisbursed: number;
    workStatus: string;
    isCompleted: boolean;
    attentionIndicator: PublicAttentionIndicator;
  }>;
}

export interface PublicProjectItem {
  workId: string;
  workDescription: string;
  house: 'Lok Sabha';
  state: string;
  district: string;
  constituency: string;
  mp: string;
  workCategory: string;
  financialYear: string;
  sanctionAmount: number;
  amountDisbursed: number;
  workStatus: string;
  isCompleted: boolean;
  isSanctioned: boolean;
  isRecommendedOnly: boolean;
  sanctionDate: string | null;
  completionDate: string | null;
  attentionIndicator: PublicAttentionIndicator;
}

export interface PublicProjectsResponse {
  projects: PublicProjectItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicProjectDetailResponse {
  workId: string;
  workDescription: string;
  house: 'Lok Sabha';
  mp: string;
  state: string;
  district: string;
  constituency: string;
  workCategory: string;
  financialYear: string;
  financials: {
    sanctionAmount: number;
    recommendedAmount: number;
    amountDisbursed: number;
    expenditureAmount: number;
    disbursementRatio: number;
  };
  execution: {
    workStatus: string;
    isCompleted: boolean;
    isSanctioned: boolean;
    isRecommendedOnly: boolean;
    recommendedDate: string | null;
    sanctionDate: string | null;
    completionDate: string | null;
    daysSinceSanction: number | null;
    daysToComplete: number | null;
  };
  attentionIndicator: PublicAttentionIndicator;
}

export interface PublicKpisResponse {
  totalWorks: number;
  totalSanctionedAmount: number;
  totalDisbursedAmount: number;
  completedWorks: number;
  ongoingWorks: number;
  attentionWorks: number;
}

export interface PublicMetaResponse {
  serviceName: string;
  portalTitle: string;
  dataSource: string;
  house: string;
  coverage: string;
  totalPublicRecords: number;
  dataFreshness: string;
  disclaimer: string;
}

export interface PublicComplaintSubmission {
  workId: string;
  complaintCategory: string;
  description: string;
  complainantName?: string;
  complainantMobile?: string;
  complainantEmail?: string;
  locationLandmark?: string;
}

export interface PublicComplaintSubmitResult {
  complaintId: string;
  verificationToken: string;
  workId: string;
  category: string;
  status: string;
  submittedAt: string;
  projectSummary?: {
    constituency: string;
    state: string;
    mp: string;
  };
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  actorName: string;
  actorRole: string;
  eventType: string;
  status: string;
  remarks: string;
  publicSafe: boolean;
  metadata?: any;
  createdAt: string;
}

export interface PublicComplaintTrackingResult {
  complaintId: string;
  workId: string;
  projectTitle: string;
  complaintCategory: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  publicResponse: string;
  district?: string;
  state?: string;
  constituency?: string;
  timeline?: ComplaintEvent[];
}

export interface DistrictComplaintItem {
  complaintId: string;
  workId: string;
  workDescription: string;
  category: string;
  description: string;
  complainantName: string;
  complainantMobile?: string | null;
  complainantEmail?: string | null;
  locationLandmark: string;
  status: string;
  publicResponse?: string;
  internalNotes?: string | null;
  assignedOfficer?: string | null;
  assignedAgency?: string | null;
  submittedAt: string;
  updatedAt: string;
  closedAt?: string | null;
  district?: string;
  state?: string;
  constituency?: string;
}

export interface AgencyComplaintItem {
  complaintId: string;
  workId: string;
  workDescription: string;
  category: string;
  description: string;
  status: string;
  publicResponse?: string;
  internalNotes?: string;
  assignedAgency?: string;
  submittedAt: string;
  updatedAt: string;
  district?: string;
  state?: string;
  constituency?: string;
}

export interface AuditorComplaintItem {
  complaintId: string;
  workId: string;
  workDescription: string;
  category: string;
  description: string;
  status: string;
  publicResponse?: string;
  internalNotes?: string;
  submittedAt: string;
  updatedAt: string;
  district?: string;
  state?: string;
  constituency?: string;
}

export interface StateEscalatedComplaintItem {
  complaintId: string;
  workId: string;
  workDescription: string;
  category: string;
  description: string;
  status: string;
  publicResponse?: string;
  internalNotes?: string;
  submittedAt: string;
  updatedAt: string;
  district?: string;
  state?: string;
  constituency?: string;
}

export interface EvidenceMediaItem {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  storagePath: string;
  description?: string;
  uploadedBy?: string;
  uploaderRole?: string;
  createdAt?: string;
}

