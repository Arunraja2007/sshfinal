import React, { useState, useMemo } from 'react';
import {
  Activity, Gauge, ArrowUpDown, ChevronRight, BarChart3,
  Layers, Search, AlertTriangle, ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine
} from 'recharts';

export interface WorkCategoryRiskItem {
  category: string;
  total: number;
  high: number;
  med: number;
  low: number;
  avg_risk?: number;
  sanctioned?: number;
  disbursed?: number;
}

interface CategoryRiskDistributionProps {
  data: WorkCategoryRiskItem[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  scopeLabel?: string;
  onSelectCategory?: (categoryName: string) => void;
  selectedCategory?: string;
  compact?: boolean;
  maxItems?: number;
  className?: string;
}

type SortOption = 'risk_score_desc' | 'risk_score_asc' | 'total_desc' | 'name_asc';

function getShortCategoryName(name: string): string {
  if (!name) return 'General';
  const clean = name.replace(/^\d+\/\d+-/g, '').trim();
  const lower = clean.toLowerCase();
  if (lower.includes('road') || lower.includes('bridge') || lower.includes('pathway')) return 'Roads & Bridges';
  if (lower.includes('drinking') || (lower.includes('water') && !lower.includes('drain'))) return 'Drinking Water';
  if (lower.includes('school') || lower.includes('education')) return 'Education';
  if (lower.includes('health') || lower.includes('sanitation') || lower.includes('hospital') || lower.includes('medical')) return 'Health & Sanitation';
  if (lower.includes('community') || lower.includes('hall') || lower.includes('bhavan')) return 'Community Halls';
  if (lower.includes('electric') || lower.includes('solar') || lower.includes('energy') || lower.includes('light')) return 'Electricity';
  if (lower.includes('sport') || lower.includes('cultural') || lower.includes('stadium')) return 'Sports & Culture';
  if (lower.includes('irrigation') || lower.includes('drain') || lower.includes('flood')) return 'Irrigation';
  if (lower.includes('skill') || lower.includes('training')) return 'Skill Dev';
  if (lower.includes('environment') || lower.includes('park')) return 'Environment';
  if (clean.length > 16) return clean.substring(0, 14) + '…';
  return clean;
}

export function CategoryRiskDistribution({
  data = [],
  loading = false,
  title = 'Risk Score by Work Category',
  subtitle,
  scopeLabel,
  onSelectCategory,
  selectedCategory,
  compact = false,
  maxItems = 8,
  className = '',
}: CategoryRiskDistributionProps) {
  const [sortOption, setSortOption] = useState<SortOption>('risk_score_desc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Process data and compute Risk Score (0-100)
  const enrichedCategories = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item) => {
      const total = Number(item.total || 0) || ((item.high || 0) + (item.med || 0) + (item.low || 0)) || 1;
      const high = Number(item.high || 0);
      const med = Number(item.med || 0);
      const low = Number(item.low || 0);

      const highPct = total > 0 ? (high / total) * 100 : 0;
      const medPct = total > 0 ? (med / total) * 100 : 0;
      const lowPct = total > 0 ? (low / total) * 100 : 0;

      // Compute or retrieve Average Risk Score (0-100)
      const computedRiskScore = Math.min(
        100,
        Math.max(0, Math.round(((high * 85) + (med * 50) + (low * 15)) / total))
      );
      const riskScore = (item.avg_risk && item.avg_risk > 0)
        ? Math.round(Number(item.avg_risk))
        : computedRiskScore;

      // Category names
      let cleanName = (item.category || 'General Works').replace(/^\d+\/\d+-/g, '').trim();
      if (!cleanName) cleanName = 'General Infrastructure';
      const shortName = getShortCategoryName(cleanName);

      // Risk score classification & colors
      let riskTier: 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
      let tierColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      let barColor = '#10B981'; // emerald
      let tierBadge = 'Low Risk';

      if (riskScore >= 60 || highPct >= 30) {
        riskTier = 'HIGH';
        tierColor = 'text-red-700 bg-red-50 border-red-200';
        barColor = '#DC3545'; // crimson
        tierBadge = 'High Risk';
      } else if (riskScore >= 35 || highPct >= 12 || medPct >= 40) {
        riskTier = 'MODERATE';
        tierColor = 'text-amber-700 bg-amber-50 border-amber-200';
        barColor = '#F59E0B'; // amber
        tierBadge = 'Moderate';
      }

      return {
        ...item,
        category: cleanName,
        shortName,
        rawCategory: item.category,
        total,
        high,
        med,
        low,
        highPct,
        medPct,
        lowPct,
        riskScore,
        riskTier,
        tierColor,
        barColor,
        tierBadge,
      };
    });
  }, [data]);

  // Filter & Sort
  const processedCategories = useMemo(() => {
    let list = [...enrichedCategories];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((c) => c.category.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      switch (sortOption) {
        case 'risk_score_desc':
          return b.riskScore - a.riskScore || b.total - a.total;
        case 'risk_score_asc':
          return a.riskScore - b.riskScore || a.total - b.total;
        case 'total_desc':
          return b.total - a.total || b.riskScore - a.riskScore;
        case 'name_asc':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    if (maxItems && maxItems > 0 && !searchTerm) {
      return list.slice(0, maxItems);
    }
    return list;
  }, [enrichedCategories, sortOption, searchTerm, maxItems]);

  // Top summary insights
  const insights = useMemo(() => {
    if (enrichedCategories.length === 0) return null;

    const highest = [...enrichedCategories].sort((a, b) => b.riskScore - a.riskScore)[0];
    const lowest = [...enrichedCategories].filter(c => c.total >= 3).sort((a, b) => a.riskScore - b.riskScore)[0] || enrichedCategories[0];
    const totalProjects = enrichedCategories.reduce((acc, c) => acc + c.total, 0);
    const weightedSum = enrichedCategories.reduce((acc, c) => acc + (c.riskScore * c.total), 0);
    const avgScore = totalProjects > 0 ? Math.round(weightedSum / totalProjects) : 0;

    return {
      highest,
      lowest,
      avgScore,
      totalCount: enrichedCategories.length,
    };
  }, [enrichedCategories]);

  return (
    <div className={`bg-white border border-[#E9ECEF] rounded-lg shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* ── Compact Header ── */}
      <div className="px-4 py-3 border-b border-[#E9ECEF] bg-[#FCFCFD] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="p-1 bg-blue-50 text-[#00204a] rounded border border-blue-200">
            <Activity size={14} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#000a1f] tracking-tight">
                {title}
              </h3>
              {scopeLabel && (
                <span className="text-[10px] font-bold text-[#00204a] bg-[#EEF2F6] px-1.5 py-0.2 rounded border border-[#D5DCE4]">
                  {scopeLabel}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-[#6C757D] leading-tight mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Compact Controls */}
        <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
          {insights && (
            <span className="text-[11px] font-mono text-slate-600 hidden md:inline-block">
              Avg Risk: <strong className="text-slate-900 font-bold">{insights.avgScore}/100</strong>
            </span>
          )}

          <div className="flex items-center gap-1 bg-[#F8F9FA] px-2 py-0.5 rounded border border-[#CED4DA] text-[11px]">
            <ArrowUpDown size={11} className="text-slate-500" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-[11px] text-[#495057] font-medium focus:outline-none cursor-pointer"
              title="Sort Vertical Bars"
            >
              <option value="risk_score_desc">Highest Risk Score ↓</option>
              <option value="risk_score_asc">Lowest Risk Score ↑</option>
              <option value="total_desc">Total Works Volume ↓</option>
              <option value="name_asc">Category Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Compact Vertical Bar Chart Area ── */}
      <div className="p-3 sm:p-4 flex-1">
        {loading ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <div className="w-5 h-5 rounded-full border-2 border-[#00204a] border-t-transparent animate-spin" />
            <span>Plotting vertical risk score graph…</span>
          </div>
        ) : processedCategories.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded">
            No work categories available for current filter selection.
          </div>
        ) : (
          <div className="w-full h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedCategories}
                margin={{ top: 18, right: 15, left: -20, bottom: 25 }}
              >
                <XAxis
                  dataKey="shortName"
                  stroke="#c4c6d0"
                  fontSize={10}
                  tick={{ fill: '#000a1f', fontWeight: 600 }}
                  interval={0}
                  angle={processedCategories.length > 5 ? -25 : 0}
                  textAnchor={processedCategories.length > 5 ? 'end' : 'middle'}
                  height={32}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#c4c6d0"
                  fontSize={10}
                  tick={{ fill: '#44474f' }}
                  ticks={[0, 25, 50, 75, 100]}
                />
                {/* Reference Threshold Lines */}
                <ReferenceLine
                  y={60}
                  stroke="#DC3545"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  label={{ value: 'High Risk (60)', fill: '#DC3545', fontSize: 9, position: 'right' }}
                />
                <ReferenceLine
                  y={35}
                  stroke="#F59E0B"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  label={{ value: 'Moderate (35)', fill: '#B45309', fontSize: 9, position: 'right' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as any;
                      return (
                        <div className="bg-white p-2.5 rounded shadow-lg border border-[#CED4DA] text-xs space-y-1 min-w-[210px]">
                          <div className="font-bold text-[#000a1f] border-b border-slate-100 pb-1 flex items-center justify-between gap-2">
                            <span className="truncate">{item.category}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${item.tierColor}`}>
                              {item.tierBadge}
                            </span>
                          </div>
                          <div className="flex justify-between items-center font-mono text-xs bg-slate-50 p-1.5 rounded">
                            <span className="font-bold text-slate-700">Risk Score:</span>
                            <strong className="text-white text-xs px-2 py-0.5 rounded font-black" style={{ backgroundColor: item.barColor }}>
                              {item.riskScore} / 100
                            </strong>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                            <span>Total Works:</span>
                            <strong>{item.total.toLocaleString()}</strong>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100 flex justify-between">
                            <span className="text-red-700 font-semibold">High: {item.high} ({item.highPct.toFixed(0)}%)</span>
                            <span className="text-amber-700 font-semibold">Med: {item.med} ({item.medPct.toFixed(0)}%)</span>
                            <span className="text-emerald-700 font-semibold">Low: {item.low} ({item.lowPct.toFixed(0)}%)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="riskScore"
                  name="Risk Score (0-100)"
                  radius={[3, 3, 0, 0]}
                  onClick={(data: any) => {
                    if (onSelectCategory && data?.payload) {
                      onSelectCategory(data.payload.rawCategory || data.payload.category);
                    }
                  }}
                  className={onSelectCategory ? 'cursor-pointer hover:opacity-85' : ''}
                >
                  {processedCategories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.barColor}
                      stroke={selectedCategory === entry.category || selectedCategory === entry.rawCategory ? '#00204a' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Compact Category Chips Bar ── */}
        {processedCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 border-t border-slate-100">
            {processedCategories.map((c, idx) => (
              <button
                key={c.category + idx}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(c.rawCategory || c.category)}
                className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium border flex items-center gap-1.5 transition-all ${
                  selectedCategory === c.category || selectedCategory === c.rawCategory
                    ? 'bg-[#00204a] text-white border-[#00204a]'
                    : 'bg-[#F8F9FA] hover:bg-slate-100 text-slate-700 border-slate-200'
                } ${onSelectCategory ? 'cursor-pointer' : ''}`}
                title={`Click to filter by ${c.category}`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.barColor }} />
                <span className="font-semibold truncate max-w-[120px]">{c.shortName}</span>
                <span className="font-mono font-bold">{c.riskScore}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Compact Risk Score Legend Footer ── */}
      <div className="px-4 py-2 bg-[#F8F9FA] border-t border-[#E9ECEF] flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-600">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700">Risk Score Scale:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#DC3545]" />
            <span>60–100 (High Risk)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span>35–59 (Moderate)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>0–34 (Low Risk)</span>
          </span>
        </div>

        <div className="text-[10px] text-slate-500 font-medium">
          {processedCategories.length} Categories · Vertical Risk Score Benchmark
        </div>
      </div>
    </div>
  );
}
