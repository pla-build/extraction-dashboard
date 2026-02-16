import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Treemap,
} from 'recharts'
import {
  Building2, FileText, DollarSign, Layers, TrendingUp,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Activity, Database,
} from 'lucide-react'

interface ProjectData {
  project: {
    name: string; client: string; location: string; building_type: string;
    construction_type: string; stories: number; gross_floor_area_sf: number;
    units: number; unit_type: string; report_date: string; report_number: string;
    prepared_by: string; class: string; confidence_range: string;
  };
  summary: {
    total_cost: number; cost_per_sf: number; cost_per_unit: number;
    line_count: number;
    pricing_method: { cost_db_pct: number; rate_library_fallback_pct: number; parametric_gap_fill_pct: number; match_rate: number };
  };
  sections: { name: string; divisions: string[]; pla: number; engine: number; pct: number }[];
  division_totals: Record<string, number>;
  lines: {
    description: string; quantity: number; unit: string; unit_cost: number;
    total_cost: number; csi_division: string; source: string; confidence: string;
  }[];
  benchmarks: Record<string, { total: number; sf: number; cost_per_sf: number; note: string }>;
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`
const fmtPct = (n: number) => `${n.toFixed(1)}%`

const SECTION_COLORS = [
  '#1e40af', '#0891b2', '#059669', '#65a30d', '#ca8a04',
  '#ea580c', '#dc2626', '#9333ea', '#6366f1',
]

const SOURCE_COLORS: Record<string, string> = {
  cost_db: '#059669',
  cost_db_assembly: '#10b981',
  system_breakout_db: '#0891b2',
  system_breakout_fallback: '#06b6d4',
  rate_library_fallback: '#ca8a04',
  parametric_gap_fill: '#94a3b8',
}

const SOURCE_LABELS: Record<string, string> = {
  cost_db: 'Cost Database',
  cost_db_assembly: 'DB Assembly',
  system_breakout_db: 'System Breakout (DB)',
  system_breakout_fallback: 'System Breakout (Est.)',
  rate_library_fallback: 'Rate Library',
  parametric_gap_fill: 'Parametric Gap-Fill',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#059669',
  medium: '#ca8a04',
  low: '#dc2626',
}

const DIVISION_NAMES: Record<string, string> = {
  '01': 'General Requirements', '02': 'Existing Conditions', '03': 'Concrete',
  '04': 'Masonry', '05': 'Metals', '06': 'Wood & Plastics', '07': 'Thermal/Moisture',
  '08': 'Openings', '09': 'Finishes', '10': 'Specialties', '11': 'Equipment',
  '12': 'Furnishings', '14': 'Conveying', '21': 'Fire Suppression', '22': 'Plumbing',
  '23': 'HVAC', '25': 'Integrated Automation', '26': 'Electrical',
  '27': 'Communications', '28': 'Electronic Safety', '31': 'Earthwork',
  '32': 'Ext. Improvements', '33': 'Utilities',
}

function App() {
  const [data, setData] = useState<ProjectData | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/data/estimate-v2.json').then(r => r.json()).then(setData)
  }, [])

  if (!data) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-pulse text-slate-400 text-lg">Loading estimate data...</div>
    </div>
  )

  const toggleSection = (name: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // Compute source breakdown from lines
  const sourceBreakdown = data.lines.reduce((acc, line) => {
    const src = line.source
    acc[src] = (acc[src] || 0) + line.total_cost
    return acc
  }, {} as Record<string, number>)

  const sourcePieData = Object.entries(sourceBreakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      name: SOURCE_LABELS[key] || key,
      value,
      color: SOURCE_COLORS[key] || '#64748b',
    }))

  // Section comparison for bar chart
  const sectionBarData = data.sections.map((s, i) => ({
    name: s.name.length > 14 ? s.name.slice(0, 12) + '…' : s.name,
    fullName: s.name,
    engine: s.engine,
    pla: s.pla,
    pct: s.pct,
    color: SECTION_COLORS[i],
  }))

  // Radar chart data
  const radarData = data.sections.map(s => ({
    subject: s.name.split(' ')[0],
    accuracy: Math.min(s.pct, 130),
    target: 100,
  }))

  // Treemap data
  const treemapData = data.sections.map((s, i) => ({
    name: s.name,
    size: s.engine,
    color: SECTION_COLORS[i],
  }))

  // Confidence breakdown
  const confidenceCounts = data.lines.reduce((acc, line) => {
    acc[line.confidence] = (acc[line.confidence] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const tabs = [
    { id: 'overview', label: 'Executive Summary', icon: FileText },
    { id: 'comparison', label: 'Benchmark Comparison', icon: BarChart3 },
    { id: 'breakdown', label: 'Cost Breakdown', icon: PieChartIcon },
    { id: 'details', label: 'Line Items', icon: Database },
    { id: 'methodology', label: 'Methodology', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Building2 size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">BuildCode</h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Construction Cost Intelligence</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">{data.project.report_number}</p>
              <p className="text-xs text-slate-600">{data.project.report_date}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Project Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-widest mb-1">Project Estimate Report</p>
              <h2 className="text-2xl font-bold text-white mb-2">{data.project.name}</h2>
              <p className="text-slate-400">{data.project.client}</p>
              <p className="text-sm text-slate-500 mt-1">{data.project.location} — {data.project.building_type}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{fmtK(data.summary.total_cost)}</p>
                <p className="text-xs text-slate-500 uppercase">Total Estimate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">${data.summary.cost_per_sf.toFixed(0)}</p>
                <p className="text-xs text-slate-500 uppercase">Per SF</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{fmtK(data.summary.cost_per_unit)}</p>
                <p className="text-xs text-slate-500 uppercase">Per Bed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-[72px] z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab data={data} sectionBarData={sectionBarData} sourcePieData={sourcePieData} confidenceCounts={confidenceCounts} radarData={radarData} />}
        {activeTab === 'comparison' && <ComparisonTab data={data} />}
        {activeTab === 'breakdown' && <BreakdownTab data={data} sourcePieData={sourcePieData} treemapData={treemapData} />}
        {activeTab === 'details' && <DetailsTab data={data} expandedSections={expandedSections} toggleSection={toggleSection} />}
        {activeTab === 'methodology' && <MethodologyTab data={data} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-emerald-600/20 flex items-center justify-center">
                <Building2 size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">BuildCode Ltd.</p>
                <p className="text-xs text-slate-600">Construction Cost Intelligence Platform</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              This estimate is generated by automated extraction and should be reviewed by a qualified estimator.
              {data.project.class} estimate — accuracy range {data.project.confidence_range}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================
// TAB COMPONENTS
// ============================================================

function StatCard({ icon: Icon, label, value, sub, accent = 'emerald' }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string;
  accent?: 'emerald' | 'cyan' | 'amber' | 'violet'
}) {
  const colors = {
    emerald: 'bg-emerald-600/10 text-emerald-400 border-emerald-800/50',
    cyan: 'bg-cyan-600/10 text-cyan-400 border-cyan-800/50',
    amber: 'bg-amber-600/10 text-amber-400 border-amber-800/50',
    violet: 'bg-violet-600/10 text-violet-400 border-violet-800/50',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[accent]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} />
        <span className="text-xs uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function OverviewTab({ data, sectionBarData, sourcePieData, confidenceCounts, radarData }: {
  data: ProjectData; sectionBarData: any[]; sourcePieData: any[]; confidenceCounts: Record<string, number>; radarData: any[]
}) {
  const accuracy = (data.summary.total_cost / data.benchmarks.pla.total * 100)
  const totalConfidence = Object.values(confidenceCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Estimate" value={fmt(data.summary.total_cost)} sub={`${data.summary.cost_per_sf.toFixed(2)}/SF`} accent="emerald" />
        <StatCard icon={TrendingUp} label="Benchmark Accuracy" value={`${accuracy.toFixed(1)}%`} sub="vs PLA contractor estimate" accent="cyan" />
        <StatCard icon={Layers} label="Line Items" value={`${data.summary.line_count}`} sub={`${data.summary.pricing_method.match_rate}% DB match rate`} accent="amber" />
        <StatCard icon={CheckCircle2} label="DB-Priced" value={`${(100 - data.summary.pricing_method.parametric_gap_fill_pct).toFixed(0)}%`} sub={`${data.summary.pricing_method.parametric_gap_fill_pct}% parametric`} accent="violet" />
      </div>

      {/* Project Details */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Project Information</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
            {[
              ['Building Type', data.project.building_type],
              ['Construction Type', data.project.construction_type],
              ['Gross Floor Area', `${data.project.gross_floor_area_sf.toLocaleString()} SF`],
              ['Stories', `${data.project.stories}`],
              ['Units', `${data.project.units} ${data.project.unit_type}`],
              ['Location', data.project.location],
              ['Estimate Class', data.project.class],
              ['Accuracy Range', data.project.confidence_range],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-slate-600">{label}: </span>
                <span className="text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Confidence</h3>
          <div className="space-y-3">
            {(['high', 'medium', 'low'] as const).map(level => {
              const count = confidenceCounts[level] || 0
              const pct = totalConfidence > 0 ? (count / totalConfidence * 100) : 0
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-slate-400">{level}</span>
                    <span className="text-slate-500">{count} items ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CONFIDENCE_COLORS[level] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Section Summary Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Cost by Section — Engine vs Contractor</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sectionBarData} margin={{ top: 0, right: 0, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
              formatter={(value: any) => fmt(Number(value))}
              labelFormatter={(label: any) => {
                const item = sectionBarData.find(d => d.name === label)
                return item?.fullName || String(label)
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="engine" name="BuildCode Engine" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pla" name="PLA Contractor" fill="#334155" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Source Pie */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Pricing Source Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sourcePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" paddingAngle={2}>
                {sourcePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value: any) => fmt(Number(value))} />
              <Legend formatter={(value: string) => <span className="text-xs text-slate-400">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Section Accuracy Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 130]} tick={{ fill: '#475569', fontSize: 9 }} />
              <Radar name="Accuracy %" dataKey="accuracy" stroke="#059669" fill="#059669" fillOpacity={0.2} />
              <Radar name="Target" dataKey="target" stroke="#475569" fill="none" strokeDasharray="4 4" />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function ComparisonTab({ data }: {
  data: ProjectData
}) {
  const benchmarks = [
    { label: 'Hanscomb Class A', ...data.benchmarks.hanscomb, color: '#6366f1' },
    { label: 'PLA Contractor', ...data.benchmarks.pla, color: '#334155' },
    { label: 'BuildCode Engine', ...data.benchmarks.engine, color: '#059669' },
  ]

  return (
    <div className="space-y-8">
      {/* Benchmark Cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {benchmarks.map(b => (
          <div key={b.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6" style={{ borderLeftColor: b.color, borderLeftWidth: '3px' }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{b.label}</p>
            <p className="text-2xl font-bold text-white mb-1">{fmt(b.total)}</p>
            <p className="text-sm text-slate-400">${b.cost_per_sf.toFixed(2)}/SF — {b.sf.toLocaleString()} SF</p>
            <p className="text-xs text-slate-600 mt-2">{b.note}</p>
          </div>
        ))}
      </div>

      {/* Section Comparison Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Section-by-Section Comparison</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <th className="text-left p-4">Section</th>
              <th className="text-right p-4">Engine</th>
              <th className="text-right p-4">PLA Actual</th>
              <th className="text-right p-4">Variance</th>
              <th className="text-right p-4 w-40">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {data.sections.map((s, i) => {
              const variance = s.engine - s.pla
              const pct = s.pct
              const barWidth = Math.min(pct, 120)
              const barColor = pct >= 90 && pct <= 110 ? '#059669' : pct >= 80 ? '#ca8a04' : '#dc2626'
              return (
                <tr key={s.name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SECTION_COLORS[i] }} />
                      <span className="text-sm text-slate-300">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-right p-4 text-sm font-mono text-slate-300">{fmt(s.engine)}</td>
                  <td className="text-right p-4 text-sm font-mono text-slate-500">{fmt(s.pla)}</td>
                  <td className={`text-right p-4 text-sm font-mono ${variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {variance >= 0 ? '+' : ''}{fmtK(variance)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(barWidth / 1.2, 100)}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="text-xs font-mono w-12 text-right" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            <tr className="bg-slate-800/30 font-semibold">
              <td className="p-4 text-sm text-white">TOTAL</td>
              <td className="text-right p-4 text-sm font-mono text-white">{fmt(data.summary.total_cost)}</td>
              <td className="text-right p-4 text-sm font-mono text-slate-400">{fmt(data.benchmarks.pla.total)}</td>
              <td className={`text-right p-4 text-sm font-mono ${data.summary.total_cost >= data.benchmarks.pla.total ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.summary.total_cost >= data.benchmarks.pla.total ? '+' : ''}{fmtK(data.summary.total_cost - data.benchmarks.pla.total)}
              </td>
              <td className="p-4">
                <span className="text-sm font-mono text-emerald-400">{(data.summary.total_cost / data.benchmarks.pla.total * 100).toFixed(1)}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BreakdownTab({ data, sourcePieData, treemapData }: {
  data: ProjectData; sourcePieData: any[]; treemapData: any[]
}) {
  // Division breakdown
  const divData = Object.entries(data.division_totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([div, total]) => ({
      name: `${div} ${DIVISION_NAMES[div] || div}`,
      total,
      pct: total / data.summary.total_cost * 100,
    }))

  return (
    <div className="space-y-8">
      {/* Treemap */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Cost Distribution</h3>
        <ResponsiveContainer width="100%" height={350}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4/3}
            stroke="#0f172a"
            content={({ x, y, width, height, name, size, color }: any) => {
              if (width < 60 || height < 30) return <rect x={x} y={y} width={width} height={height} fill={color} stroke="#0f172a" strokeWidth={2} rx={4} />
              return (
                <g>
                  <rect x={x} y={y} width={width} height={height} fill={color} stroke="#0f172a" strokeWidth={2} rx={4} />
                  <text x={x + 8} y={y + 18} fill="white" fontSize={11} fontWeight="600">{name}</text>
                  <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.6)" fontSize={10}>{fmtK(size)}</text>
                </g>
              )
            }}
          />
        </ResponsiveContainer>
      </div>

      {/* Division Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">CSI Division Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <th className="text-left p-4">Division</th>
              <th className="text-right p-4">Total</th>
              <th className="text-right p-4">$/SF</th>
              <th className="text-right p-4 w-48">Share</th>
            </tr>
          </thead>
          <tbody>
            {divData.map(d => (
              <tr key={d.name} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="p-4 text-sm text-slate-300">{d.name}</td>
                <td className="text-right p-4 text-sm font-mono text-slate-300">{fmt(d.total)}</td>
                <td className="text-right p-4 text-sm font-mono text-slate-500">${(d.total / data.project.gross_floor_area_sf).toFixed(2)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-12 text-right">{d.pct.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Source Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Pricing Source Breakdown</h3>
        <div className="grid lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sourcePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} dataKey="value" paddingAngle={2}>
                {sourcePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value: any) => fmt(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {sourcePieData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-400">{s.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-slate-300">{fmtK(s.value)}</span>
                  <span className="text-xs text-slate-600 ml-2">({(s.value / data.summary.total_cost * 100).toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailsTab({ data, expandedSections, toggleSection }: {
  data: ProjectData; expandedSections: Set<string>; toggleSection: (name: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">All Line Items by Section</h3>
          <span className="text-xs text-slate-600">{data.lines.length} items</span>
        </div>

        {data.sections.map(section => {
          const sectionLines = data.lines.filter(l => section.divisions.includes(l.csi_division))
          const isExpanded = expandedSections.has(section.name)

          return (
            <div key={section.name} className="border border-slate-800 rounded-lg mb-3 overflow-hidden">
              <button
                onClick={() => toggleSection(section.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                  <span className="font-medium text-slate-300">{section.name}</span>
                  <span className="text-xs text-slate-600">({sectionLines.length} items)</span>
                </div>
                <span className="font-mono text-sm text-slate-400">{fmt(section.engine)}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-800">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-slate-600 border-b border-slate-800/50">
                        <th className="text-left p-3 pl-12">Description</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Unit</th>
                        <th className="text-right p-3">Rate</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-center p-3">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionLines.sort((a, b) => b.total_cost - a.total_cost).map((line, i) => {
                        const sourceColor = SOURCE_COLORS[line.source] || '#64748b'
                        return (
                          <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/20 text-sm">
                            <td className="p-3 pl-12 text-slate-400 max-w-xs truncate">{line.description}</td>
                            <td className="text-right p-3 font-mono text-slate-500">{line.quantity.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                            <td className="text-right p-3 text-slate-600">{line.unit}</td>
                            <td className="text-right p-3 font-mono text-slate-500">${line.unit_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="text-right p-3 font-mono text-slate-300">{fmt(line.total_cost)}</td>
                            <td className="text-center p-3">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: sourceColor }} title={line.source} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MethodologyTab({ data }: { data: ProjectData }) {
  const steps = [
    {
      title: 'PDF Classification',
      description: 'Construction drawings are classified by page type using LLaVA 34B vision model running locally on Mac Studio (96GB). Pages categorized as: SCHEDULE, PLAN, DETAIL, LEGEND, DIAGRAM, or GENERAL.',
      tech: 'LLaVA 34B (local)',
      icon: FileText,
    },
    {
      title: 'Schedule Extraction',
      description: 'Door schedules, window schedules, fixture schedules, and equipment schedules are extracted using PyMuPDF — reading embedded vector text with zero hallucination. Produces structured data with quantities, sizes, hardware, and specifications.',
      tech: 'PyMuPDF (local)',
      icon: Database,
    },
    {
      title: 'Plan Page Analysis',
      description: 'Architectural and engineering plan pages are analyzed by Claude Sonnet 4 Vision API with discipline-specific prompts. Extracts room data, fixture counts, equipment tags, and spatial relationships.',
      tech: 'Claude Sonnet 4 API (~$0.01/page)',
      icon: Layers,
    },
    {
      title: 'Cost Database Matching',
      description: `Each extracted item is matched against a ${(61259).toLocaleString()}-item cost database using a 3-layer search: synonym lookup → CSI prefix matching with broadening → description similarity scoring with size/capacity matching. Assembly templates expand matched items into component costs.`,
      tech: `${(61259).toLocaleString()} items, ${(3995).toLocaleString()} synonyms, 316 assemblies`,
      icon: DollarSign,
    },
    {
      title: 'System Breakout',
      description: 'Building systems (HVAC, plumbing, electrical, fire suppression, etc.) are broken down from $/SF rates into individual DB-priced components — ductwork by weight, piping by linear foot, fixtures by each — with quantity ratios calibrated from Hanscomb and contractor data.',
      tech: '13 divisions, 60+ component types',
      icon: Activity,
    },
    {
      title: 'Rate Library Calibration',
      description: 'Remaining gaps are filled using a rate library calibrated against Hanscomb Class A professional estimates and PLA contractor pricing. Rates are adjusted for building type, location factor, and remote premium.',
      tech: 'Hanscomb + PLA calibrated',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Extraction & Estimation Pipeline</h3>
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-800/50 flex items-center justify-center">
                  <step.icon size={18} className="text-emerald-400" />
                </div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-2" />}
              </div>
              <div className="pb-6">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-medium text-white">{step.title}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">{step.tech}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Statement */}
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-300 mb-2">Accuracy Statement</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              This is a <strong className="text-slate-300">{data.project.class}</strong> estimate with an expected accuracy range of <strong className="text-slate-300">{data.project.confidence_range}</strong>.
              It is generated through automated extraction from construction drawings and should be reviewed by a qualified cost consultant
              before use in project budgeting, financing, or procurement decisions.
              {' '}{fmtPct(data.summary.pricing_method.parametric_gap_fill_pct)} of this estimate uses parametric rates rather than item-level pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
