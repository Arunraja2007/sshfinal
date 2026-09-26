export interface PoliticalParty {
  code: string;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const INDIAN_POLITICAL_PARTIES: PoliticalParty[] = [
  {
    code: 'BJP',
    name: 'Bharatiya Janata Party',
    shortName: 'BJP',
    color: '#D95D00',
    bgColor: '#FFF5EB',
    borderColor: '#FDBA74',
  },
  {
    code: 'INC',
    name: 'Indian National Congress',
    shortName: 'INC',
    color: '#0284C7',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    code: 'DMK',
    name: 'Dravida Munnetra Kazhagam',
    shortName: 'DMK',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  {
    code: 'AITC',
    name: 'All India Trinamool Congress',
    shortName: 'TMC',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    code: 'SP',
    name: 'Samajwadi Party',
    shortName: 'SP',
    color: '#E11D48',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  {
    code: 'TDP',
    name: 'Telugu Desam Party',
    shortName: 'TDP',
    color: '#CA8A04',
    bgColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },
  {
    code: 'JDU',
    name: 'Janata Dal (United)',
    shortName: 'JD(U)',
    color: '#15803D',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  {
    code: 'SS_UBT',
    name: 'Shiv Sena (Uddhav Balasaheb Thackeray)',
    shortName: 'SS(UBT)',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  {
    code: 'SHS',
    name: 'Shiv Sena',
    shortName: 'SHS',
    color: '#F97316',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  {
    code: 'NCPSP',
    name: 'Nationalist Congress Party (Sharadchandra Pawar)',
    shortName: 'NCPSP',
    color: '#0284C7',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    code: 'NCP',
    name: 'Nationalist Congress Party',
    shortName: 'NCP',
    color: '#0369A1',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    code: 'RJD',
    name: 'Rashtriya Janata Dal',
    shortName: 'RJD',
    color: '#16A34A',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  {
    code: 'CPIM',
    name: 'Communist Party of India (Marxist)',
    shortName: 'CPI(M)',
    color: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  {
    code: 'AAP',
    name: 'Aam Aadmi Party',
    shortName: 'AAP',
    color: '#0284C7',
    bgColor: '#F0F9FF',
    borderColor: '#7DD3FC',
  },
  {
    code: 'YSRCP',
    name: 'YSR Congress Party',
    shortName: 'YSRCP',
    color: '#0D9488',
    bgColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  {
    code: 'BJD',
    name: 'Biju Janata Dal',
    shortName: 'BJD',
    color: '#15803D',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  {
    code: 'BRS',
    name: 'Bharat Rashtra Samithi',
    shortName: 'BRS',
    color: '#DB2777',
    bgColor: '#FDF2F8',
    borderColor: '#FBCFE8',
  },
  {
    code: 'JMM',
    name: 'Jharkhand Mukti Morcha',
    shortName: 'JMM',
    color: '#15803D',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  {
    code: 'AIADMK',
    name: 'All India Anna Dravida Munnetra Kazhagam',
    shortName: 'AIADMK',
    color: '#1E293B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  {
    code: 'LJPRV',
    name: 'Lok Janshakti Party (Ram Vilas)',
    shortName: 'LJPRV',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  {
    code: 'JDS',
    name: 'Janata Dal (Secular)',
    shortName: 'JD(S)',
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    code: 'SAD',
    name: 'Shiromani Akali Dal',
    shortName: 'SAD',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  {
    code: 'AIMIM',
    name: 'All India Majlis-e-Ittehadul Muslimeen',
    shortName: 'AIMIM',
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    code: 'IND',
    name: 'Independent',
    shortName: 'IND',
    color: '#475569',
    bgColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  {
    code: 'NOM',
    name: 'Nominated / Unaffiliated',
    shortName: 'NOM',
    color: '#334155',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  {
    code: 'OTHER',
    name: 'Other Party',
    shortName: 'OTHER',
    color: '#4B5563',
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
];

const STORAGE_KEY = 'mplads_mp_parties_map_v1';

// In-memory cache loaded from localStorage
let partyMapCache: Record<string, string> | null = null;

function getStoredPartyMap(): Record<string, string> {
  if (partyMapCache) return partyMapCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      partyMapCache = JSON.parse(raw);
      return partyMapCache || {};
    }
  } catch (e) {
    console.warn('[mpPartyService] Error parsing stored party map:', e);
  }
  partyMapCache = {};
  return partyMapCache;
}

function saveStoredPartyMap(map: Record<string, string>): void {
  partyMapCache = map;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[mpPartyService] Error saving party map to localStorage:', e);
  }
}

/**
 * Normalize an identifier for reliable lookup
 */
function normalizeKey(key?: string | null): string {
  if (!key) return '';
  return key
    .toLowerCase()
    .replace(/^hon'ble\s+mp\s+/i, '')
    .replace(/^mp\s+/i, '')
    .replace(/shri|smt\.|smt|dr\.|dr|shrimati|km\.|adv\./gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Get party name for a given MP name or ID
 */
export function getMpParty(mpIdOrName?: string | null): string {
  if (!mpIdOrName) return 'Bharatiya Janata Party'; // Default national party
  const map = getStoredPartyMap();
  const trimmed = mpIdOrName.trim();
  const normalized = normalizeKey(trimmed);

  if (map[trimmed]) return map[trimmed];
  if (map[trimmed.toUpperCase()]) return map[trimmed.toUpperCase()];
  if (map[normalized]) return map[normalized];

  return 'Bharatiya Janata Party';
}

/**
 * Set and persist party name for an MP
 */
export function setMpParty(mpIdOrName: string, partyName: string): void {
  if (!mpIdOrName || !partyName) return;
  const map = { ...getStoredPartyMap() };
  const trimmed = mpIdOrName.trim();
  const normalized = normalizeKey(trimmed);

  map[trimmed] = partyName;
  map[trimmed.toUpperCase()] = partyName;
  if (normalized) map[normalized] = partyName;

  saveStoredPartyMap(map);

  // Dispatch custom event for cross-component re-renders
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mp-party-updated', { detail: { mpIdOrName, partyName } }));
  }
}

/**
 * Lookup party styling & info by party name or code
 */
export function getPartyInfo(partyNameOrCode?: string | null): PoliticalParty {
  if (!partyNameOrCode) {
    return INDIAN_POLITICAL_PARTIES[0]; // BJP default
  }

  const query = partyNameOrCode.trim().toLowerCase();

  const found = INDIAN_POLITICAL_PARTIES.find(p =>
    p.code.toLowerCase() === query ||
    p.shortName.toLowerCase() === query ||
    p.name.toLowerCase() === query ||
    p.name.toLowerCase().includes(query)
  );

  if (found) return found;

  return {
    code: partyNameOrCode.substring(0, 8).toUpperCase(),
    name: partyNameOrCode,
    shortName: partyNameOrCode.split(' ').map(w => w[0]).join('').substring(0, 6).toUpperCase() || 'PARTY',
    color: '#00204a',
    bgColor: '#F0F4F8',
    borderColor: '#D5DCE4',
  };
}
