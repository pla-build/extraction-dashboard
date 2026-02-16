import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap } from 'recharts'
import { FileText, Layers, Cpu, Zap, Building2, DollarSign, Database, Search, Shield, TrendingUp } from 'lucide-react'

interface EstimateLine {
  line_num: number; division: string; division_name: string; description: string;
  quantity: number; unit: string; unit_cost?: number; material_cost?: number;
  labor_cost?: number; equipment_cost?: number; total_cost: number;
  confidence?: number; extraction_confidence?: number; source?: string;
  estimate_source?: string; source_type?: string;
}

interface DivisionSummary {
  division_name: string; count: number; total: number;
  schedule_count?: number; parametric_count?: number;
}

interface V3Data {
  project: any;
  metadata: any;
  metadata_extended?: any;
  summary_by_division: Record<string, DivisionSummary>;
  lines: EstimateLine[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#a855f7'];

function StatCard({ icon: Icon, label, value, sub, accent = '#3b82f6' }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-bc-card border border-bc-border rounded-xl p-5 hover:scale-[1.02] transition-transform"
      style={{ boxShadow: `0 0 20px ${accent}15, 0 0 60px ${accent}05` }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ background: `${accent}15` }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <span className="text-bc-muted text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-bc-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}

function CostBar({ name, cost, total, color, count, schedCount, paramCount }: {
  name: string; cost: number; total: number; color: string; count: number;
  schedCount?: number; paramCount?: number;
}) {
  const pct = total > 0 ? (cost / total) * 100 : 0;
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium">{name}</span>
        <div className="flex items-center gap-3">
          {schedCount !== undefined && (
            <span className="text-xs text-bc-green">{schedCount}S</span>
          )}
          {paramCount !== undefined && paramCount > 0 && (
            <span className="text-xs text-bc-amber">{paramCount}P</span>
          )}
          <span className="text-xs text-bc-muted">{count} items</span>
          <span className="text-sm font-semibold" style={{ color }}>${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      <div className="h-3 bg-bc-darker rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 group-hover:brightness-125" style={{ width: `${Math.max(pct, 1)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<V3Data | null>(null);
  const [activeTab, setActiveTab] = useState<'estimate' | 'sources' | 'items'>('estimate');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/data/estimate-v3.json').then(r => r.json()).then(setData).catch(console.error);
  }, []);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="gradient-border w-16 h-16 rounded-full mx-auto mb-4 p-[2px]">
          <div className="w-full h-full bg-bc-darker rounded-full flex items-center justify-center">
            <Cpu className="w-8 h-8 text-bc-accent animate-spin" />
          </div>
        </div>
        <p className="text-bc-muted">Loading V3 estimate...</p>
      </div>
    </div>
  );

  const divArray = Object.entries(data.summary_by_division)
    .map(([code, d], i) => ({ code, ...d, color: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.total - a.total);

  const costChartData = divArray.map(d => ({
    name: d.division_name.length > 25 ? d.division_name.slice(0, 23) + '…' : d.division_name,
    cost: Math.round(d.total),
    count: d.count,
  }));

  const pieData = divArray.map(d => ({ name: d.division_name, value: d.total }));

  const filteredLines = (data.lines || []).filter(line => {
    const matchSearch = !searchQuery || line.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiv = selectedDivision === 'all' || line.division === selectedDivision;
    const matchSource = sourceFilter === 'all' || line.estimate_source === sourceFilter;
    return matchSearch && matchDiv && matchSource;
  });

  const treemapData = divArray.filter(d => d.total > 0).map(d => ({
    name: d.division_name, size: d.total, fill: d.color,
  }));

  const totalCost = data.metadata.total_cost;
  const ext = data.metadata_extended || {};
  const totalWithMarkups = ext.total_with_markups || totalCost * 1.28;
  const schedItems = data.metadata.schedule_items || 0;
  const paramItems = data.metadata.parametric_items || 0;
  const schedCost = data.metadata.schedule_cost || 0;
  const paramCost = data.metadata.parametric_cost || 0;

  return (
    <div className="min-h-screen bg-bc-darker">
      {/* Header */}
      <header className="border-b border-bc-border bg-bc-dark/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="gradient-border rounded-lg p-[2px]">
                <div className="bg-bc-dark rounded-[6px] px-3 py-1.5 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-bc-accent" />
                  <span className="font-bold text-lg tracking-tight">BuildCode</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold">Extruction Engine V3</h1>
                <p className="text-bc-muted text-sm">Multi-Pass Quantity Surveying</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-bc-green">
                <div className="w-2 h-2 rounded-full bg-bc-green pulse-dot" />
                PyMuPDF + Parametric · $0 API
              </div>
              <div className="text-sm text-bc-muted">v3.0</div>
            </div>
          </div>
        </div>
      </header>

      {/* Project Banner */}
      <div className="border-b border-bc-border bg-bc-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-6 h-6 text-bc-accent" />
            <h2 className="text-2xl font-bold">{data.project.name}</h2>
            <span className="px-3 py-1 rounded-full bg-bc-accent/10 text-bc-accent text-sm font-medium">
              {data.project.facility_type}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-bc-muted">
            <span>📍 {data.project.location}</span>
            <span>🏗️ CCI: {data.project.cci}</span>
            <span>🔧 Pipeline: {data.project.pipeline_version}</span>
          </div>

          {/* Cost Hero */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="text-bc-muted text-xs mb-1">Base Estimate</div>
              <div className="text-4xl font-bold tracking-tight text-bc-green">
                ${(totalCost / 1_000_000).toFixed(1)}M
              </div>
            </div>
            <div>
              <div className="text-bc-muted text-xs mb-1">With Markups (28%)</div>
              <div className="text-3xl font-bold tracking-tight text-bc-accent">
                ${(totalWithMarkups / 1_000_000).toFixed(1)}M
              </div>
            </div>
            <div>
              <div className="text-bc-muted text-xs mb-1">Per Bed</div>
              <div className="text-2xl font-bold">${(totalWithMarkups / 96).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div className="text-bc-muted text-xs mb-1">Per SF</div>
              <div className="text-2xl font-bold">${(totalWithMarkups / 72000).toFixed(0)}</div>
            </div>
            <div>
              <div className="text-bc-muted text-xs mb-1">Line Items</div>
              <div className="text-2xl font-bold">{data.metadata.total_line_items.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={DollarSign} label="Base Cost" value={`$${(totalCost/1_000_000).toFixed(1)}M`} sub={`${data.metadata.total_line_items} line items`} accent="#10b981" />
          <StatCard icon={TrendingUp} label="With Markups" value={`$${(totalWithMarkups/1_000_000).toFixed(1)}M`} sub="OH&P + contingency" accent="#3b82f6" />
          <StatCard icon={FileText} label="Schedule Items" value={String(schedItems)} sub={`$${(schedCost/1000).toFixed(0)}K extracted`} accent="#8b5cf6" />
          <StatCard icon={Database} label="Parametric Items" value={String(paramItems)} sub={`$${(paramCost/1_000_000).toFixed(1)}M benchmarked`} accent="#f59e0b" />
          <StatCard icon={Layers} label="CSI Divisions" value={String(data.metadata.divisions_covered)} sub="Of 22 standard" accent="#06b6d4" />
          <StatCard icon={Shield} label="Confidence" value="Grade B" sub="70% overall" accent="#10b981" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bc-card rounded-xl p-1 mb-8 border border-bc-border w-fit">
          {(['estimate', 'sources', 'items'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-bc-accent text-white shadow-lg' : 'text-bc-muted hover:text-bc-text hover:bg-bc-border/50'
              }`}>
              {tab === 'estimate' ? '💰 Estimate' : tab === 'sources' ? '🔍 Sources' : '📋 Line Items'}
            </button>
          ))}
        </div>

        {activeTab === 'estimate' && (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-green">
                <h3 className="text-lg font-bold mb-4">Cost by CSI Division</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={costChartData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={160} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }}
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Cost']} />
                    <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                      {costChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-purple">
                <h3 className="text-lg font-bold mb-4">Cost Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} innerRadius={60} paddingAngle={2} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }}
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Cost']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-3">
                  {divArray.slice(0, 10).map((d, i) => (
                    <div key={d.code} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-bc-muted">{d.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Division Breakdown */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-1">Division Cost Breakdown</h3>
              <p className="text-bc-muted text-sm mb-6">
                <span className="text-bc-green">S</span> = Schedule extracted · <span className="text-bc-amber">P</span> = Parametric
              </p>
              <div className="space-y-4">
                {divArray.map((d) => (
                  <CostBar key={d.code} name={`${d.code} — ${d.division_name}`} cost={d.total} total={totalCost}
                    color={d.color} count={d.count}
                    schedCount={d.schedule_count} paramCount={d.parametric_count} />
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-bc-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Base Subtotal</span>
                  <span className="font-bold text-xl">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center text-bc-muted text-sm">
                  <span>Contractor OH&P (15%)</span>
                  <span>${(totalCost * 0.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center text-bc-muted text-sm">
                  <span>Design Contingency (10%)</span>
                  <span>${(totalCost * 0.10).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center text-bc-muted text-sm">
                  <span>Escalation (3%)</span>
                  <span>${(totalCost * 0.03).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-bc-border">
                  <span className="font-bold text-lg">Total Project Cost</span>
                  <span className="font-bold text-2xl text-bc-green">${totalWithMarkups.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Treemap */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-blue">
              <h3 className="text-lg font-bold mb-4">Cost Volume Map</h3>
              <ResponsiveContainer width="100%" height={250}>
                <Treemap data={treemapData} dataKey="size" nameKey="name"
                  content={({ x, y, width, height, name, fill }: any) => (
                    width > 50 && height > 30 ? (
                      <g>
                        <rect x={x} y={y} width={width} height={height} fill={fill} rx={6} opacity={0.85} />
                        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central"
                          fill="white" fontSize={width > 120 ? 11 : 9} fontWeight="600">{name}</text>
                      </g>
                    ) : (
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} opacity={0.7} />
                    )
                  )}
                />
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-8">
            {/* Source Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-green">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5 text-bc-green" />
                  <h3 className="text-lg font-bold">Schedule Extraction (PyMuPDF)</h3>
                </div>
                <div className="text-3xl font-bold mb-2 text-bc-green">{schedItems} items</div>
                <div className="text-bc-muted text-sm mb-4">${(schedCost/1000).toFixed(0)}K from actual drawing data</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-bc-muted">Method</span><span>PDF vector text extraction</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">Confidence</span><span className="text-bc-green">85-90% (direct reading)</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">Covers</span><span>Doors, windows, equipment, fixtures</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">API Cost</span><span className="text-bc-green">$0.00</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">Processing</span><span>~2 minutes (all 6 PDFs)</span></div>
                </div>
                <div className="mt-4 p-3 bg-bc-darker rounded-lg text-xs text-bc-muted">
                  <strong className="text-bc-green">Key insight:</strong> Schedule tables contain architect-counted quantities.
                  PyMuPDF reads them directly from PDF vector data — zero hallucination risk.
                </div>
              </div>

              <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-amber">
                <div className="flex items-center gap-3 mb-4">
                  <Database className="w-5 h-5 text-bc-amber" />
                  <h3 className="text-lg font-bold">Parametric Estimation</h3>
                </div>
                <div className="text-3xl font-bold mb-2 text-bc-amber">{paramItems} items</div>
                <div className="text-bc-muted text-sm mb-4">${(paramCost/1_000_000).toFixed(1)}M from industry benchmarks</div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-bc-muted">Method</span><span>RSMeans + Ontario LTC ratios</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">Confidence</span><span className="text-bc-amber">50-70% (benchmarked)</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">Covers</span><span>Concrete, steel, MEP, site work</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">Building Params</span><span>96 beds, 72,000 SF, 3 storeys</span></div>
                  <div className="flex justify-between"><span className="text-bc-muted">CCI Factor</span><span>0.92 (Gore Bay, ON)</span></div>
                </div>
                <div className="mt-4 p-3 bg-bc-darker rounded-lg text-xs text-bc-muted">
                  <strong className="text-bc-amber">Key insight:</strong> Area-based work (concrete, finishes, MEP) can't be
                  extracted from schedule tables. Parametric fills these gaps using known building parameters.
                </div>
              </div>
            </div>

            {/* V2 vs V3 Comparison */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">V2 → V3 Improvement</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-bc-muted">V2 (LLaVA Vision Only)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total</span><span className="text-red-400">$14.1M</span></div>
                    <div className="flex justify-between"><span>Divisions</span><span className="text-red-400">9</span></div>
                    <div className="flex justify-between"><span>Confidence</span><span className="text-red-400">Grade C (100% low)</span></div>
                    <div className="flex justify-between"><span>Quantities</span><span className="text-red-400">Hallucinated (230K SF glazing)</span></div>
                    <div className="flex justify-between"><span>Method</span><span className="text-red-400">Single vision prompt</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-bc-green">V3 (Multi-Pass)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total</span><span className="text-bc-green">${(totalWithMarkups/1_000_000).toFixed(1)}M</span></div>
                    <div className="flex justify-between"><span>Divisions</span><span className="text-bc-green">{data.metadata.divisions_covered}</span></div>
                    <div className="flex justify-between"><span>Confidence</span><span className="text-bc-green">Grade B (70%)</span></div>
                    <div className="flex justify-between"><span>Quantities</span><span className="text-bc-green">Real data + validated benchmarks</span></div>
                    <div className="flex justify-between"><span>Method</span><span className="text-bc-green">PyMuPDF tables + parametric</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">V3 Pipeline Architecture</h3>
              <div className="grid md:grid-cols-5 gap-4">
                {[
                  { name: 'Page Classifier', desc: 'LLaVA 34B', icon: '🔍', stat: '130 pages classified', detail: '48 schedules, 68 plans' },
                  { name: 'Schedule Extract', desc: 'PyMuPDF tables', icon: '📋', stat: '1,570 rows', detail: 'Direct PDF text reading' },
                  { name: 'Parametric Fill', desc: 'RSMeans benchmarks', icon: '📐', stat: '109 items', detail: '96-bed LTC ratios' },
                  { name: 'Cost Matcher', desc: '61,259 item DB', icon: '💰', stat: '57-81% match rate', detail: 'Fuzzy keyword matching' },
                  { name: 'Validator', desc: 'Building params', icon: '✅', stat: 'Grade B', detail: '22 div coverage check' },
                ].map(tech => (
                  <div key={tech.name} className="bg-bc-darker rounded-lg p-4 border border-bc-border/50">
                    <div className="text-2xl mb-2">{tech.icon}</div>
                    <div className="font-semibold text-sm">{tech.name}</div>
                    <div className="text-bc-muted text-xs mt-1">{tech.desc}</div>
                    <div className="text-bc-green text-xs mt-2 font-medium">{tech.stat}</div>
                    <div className="text-bc-muted text-xs">{tech.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bc-muted" />
                <input type="text" placeholder="Search line items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-bc-card border border-bc-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-bc-accent" />
              </div>
              <select value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)}
                className="bg-bc-card border border-bc-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-bc-accent">
                <option value="all">All Divisions</option>
                {divArray.map(d => <option key={d.code} value={d.code}>{d.code} — {d.division_name}</option>)}
              </select>
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                className="bg-bc-card border border-bc-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-bc-accent">
                <option value="all">All Sources</option>
                <option value="schedule_extraction">📋 Schedule Extracted</option>
                <option value="parametric">📐 Parametric</option>
              </select>
            </div>

            <div className="text-sm text-bc-muted mb-4">{filteredLines.length.toLocaleString()} line items</div>

            <div className="bg-bc-card border border-bc-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bc-border bg-bc-darker">
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">#</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Div</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Description</th>
                    <th className="text-right px-4 py-3 text-bc-muted font-medium">Qty</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Unit</th>
                    <th className="text-right px-4 py-3 text-bc-muted font-medium">Total</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Source</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.slice(0, 200).map((line, i) => (
                    <tr key={i} className="border-b border-bc-border/50 hover:bg-bc-border/20 transition-colors">
                      <td className="px-4 py-2.5 text-bc-muted text-xs">{line.line_num}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: `${COLORS[divArray.findIndex(d => d.code === line.division) % COLORS.length]}20`,
                          color: COLORS[divArray.findIndex(d => d.code === line.division) % COLORS.length]
                        }}>{line.division}</span>
                      </td>
                      <td className="px-4 py-2.5 max-w-sm truncate text-xs">{line.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{typeof line.quantity === 'number' ? line.quantity.toLocaleString() : line.quantity}</td>
                      <td className="px-4 py-2.5 text-bc-muted text-xs">{line.unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-xs">${line.total_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          line.estimate_source === 'schedule_extraction' ? 'bg-green-500/10 text-bc-green' : 'bg-amber-500/10 text-bc-amber'
                        }`}>
                          {line.estimate_source === 'schedule_extraction' ? '📋' : '📐'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-1.5 bg-bc-darker rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${((line.confidence || line.extraction_confidence || 0)) * 100}%`,
                              background: (line.confidence || line.extraction_confidence || 0) > 0.7 ? '#10b981' : (line.confidence || line.extraction_confidence || 0) > 0.4 ? '#f59e0b' : '#ef4444'
                            }} />
                          </div>
                          <span className="text-xs text-bc-muted">{Math.round(((line.confidence || line.extraction_confidence || 0)) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLines.length > 200 && (
                <div className="px-4 py-3 text-center text-bc-muted text-sm border-t border-bc-border">
                  Showing 200 of {filteredLines.length.toLocaleString()} items
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-bc-border py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-sm text-bc-muted">
          <span>⚡ BuildCode Ltd. · Extruction Engine v3.0</span>
          <span>PyMuPDF Schedule Extraction + Parametric Fill · 100% Local · $0 Cost</span>
        </div>
      </footer>
    </div>
  );
}
