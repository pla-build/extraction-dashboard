import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap } from 'recharts'
import { FileText, Layers, Cpu, Zap, Building2, DollarSign, Database, Search } from 'lucide-react'

interface ExtractionData {
  project: {
    name: string; location: string; type: string; stories: number;
    blocks: string; expected_value: string; extraction_method: string; cost_per_extraction: string;
  };
  summary: { total_items: number; total_pages: number; disciplines: number; extraction_sources: number };
  disciplines: Record<string, { name: string; items: number; pages: number; source_file: string; extraction_time: number }>;
  type_breakdown: Record<string, number>;
  sample_items: Array<{ page: number; type: string; content: string; confidence: number; discipline: string }>;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  const glowClass = `glow-${color}`;
  return (
    <div className={`bg-bc-card border border-bc-border rounded-xl p-6 ${glowClass} hover:scale-[1.02] transition-transform`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-bc-${color}/10`}>
          <Icon className={`w-5 h-5 text-bc-${color}`} />
        </div>
        <span className="text-bc-muted text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-bc-muted text-sm mt-1">{sub}</div>}
    </div>
  );
}

function DisciplineBar({ name, items, total, color, pages }: { name: string; items: number; total: number; color: string; pages: number }) {
  const pct = total > 0 ? (items / total) * 100 : 0;
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-sm text-bc-muted">{items.toLocaleString()} items · {pages} pages</span>
      </div>
      <div className="h-3 bg-bc-darker rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 group-hover:brightness-125" style={{ width: `${Math.max(pct, 1)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<ExtractionData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'disciplines' | 'items'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');

  useEffect(() => {
    fetch('/data/extraction-v1.json').then(r => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="gradient-border w-16 h-16 rounded-full mx-auto mb-4 p-[2px]">
          <div className="w-full h-full bg-bc-darker rounded-full flex items-center justify-center">
            <Cpu className="w-8 h-8 text-bc-accent animate-spin" />
          </div>
        </div>
        <p className="text-bc-muted">Loading extraction data...</p>
      </div>
    </div>
  );

  const discArray = Object.entries(data.disciplines)
    .map(([key, d], i) => ({ key, ...d, color: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.items - a.items);

  const chartData = discArray.map(d => ({ name: d.name.replace('Mechanical ', 'Mech '), items: d.items, pages: d.pages }));

  const typeData = Object.entries(data.type_breakdown)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value }))
    .sort((a, b) => b.value - a.value);

  const filteredItems = data.sample_items.filter(item => {
    const matchSearch = !searchQuery || item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDisc = selectedDiscipline === 'all' || item.discipline === selectedDiscipline;
    return matchSearch && matchDisc;
  });

  const treemapData = discArray.map(d => ({
    name: d.name,
    size: d.items,
    fill: d.color,
  }));

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
                <h1 className="text-xl font-bold">Extruction Engine</h1>
                <p className="text-bc-muted text-sm">Construction Document Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-bc-green">
                <div className="w-2 h-2 rounded-full bg-bc-green pulse-dot" />
                100% Local · $0 Cost
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Project Banner */}
      <div className="border-b border-bc-border bg-bc-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-bc-accent" />
            <h2 className="text-2xl font-bold">{data.project.name}</h2>
            <span className="px-3 py-1 rounded-full bg-bc-accent/10 text-bc-accent text-sm font-medium">
              {data.project.type}
            </span>
          </div>
          <div className="flex gap-6 text-sm text-bc-muted">
            <span>📍 {data.project.location}</span>
            <span>🏗️ {data.project.stories} Storey · Blocks {data.project.blocks}</span>
            <span>💰 Expected: {data.project.expected_value}</span>
            <span>🤖 {data.project.extraction_method}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Database} label="Items Extracted" value={data.summary.total_items.toLocaleString()} sub="From construction documents" color="blue" />
          <StatCard icon={FileText} label="Pages Processed" value={data.summary.total_pages.toLocaleString()} sub="Across all disciplines" color="purple" />
          <StatCard icon={Layers} label="Disciplines" value={String(data.summary.disciplines)} sub="Engineering specialties" color="green" />
          <StatCard icon={DollarSign} label="API Cost" value="$0.00" sub="100% local processing" color="amber" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bc-card rounded-xl p-1 mb-8 border border-bc-border w-fit">
          {(['overview', 'disciplines', 'items'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-bc-accent text-white shadow-lg' : 'text-bc-muted hover:text-bc-text hover:bg-bc-border/50'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-blue">
                <h3 className="text-lg font-bold mb-4">Items by Discipline</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
                    <Bar dataKey="items" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-purple">
                <h3 className="text-lg font-bold mb-4">Content Types</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={typeData.slice(0, 8)} cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={3} dataKey="value">
                      {typeData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-4">
                  {typeData.slice(0, 8).map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-bc-muted">{t.name} ({t.value.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Discipline Breakdown */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-6">Discipline Breakdown</h3>
              <div className="space-y-4">
                {discArray.map((d) => (
                  <DisciplineBar key={d.key} name={d.name} items={d.items} total={data.summary.total_items} color={d.color} pages={d.pages} />
                ))}
              </div>
            </div>

            {/* Treemap */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6 glow-green">
              <h3 className="text-lg font-bold mb-4">Extraction Volume Map</h3>
              <ResponsiveContainer width="100%" height={250}>
                <Treemap data={treemapData} dataKey="size" nameKey="name" stroke="#0a0e17"
                  content={({ x, y, width, height, name, fill }: any) => (
                    width > 50 && height > 30 ? (
                      <g>
                        <rect x={x} y={y} width={width} height={height} fill={fill} rx={6} opacity={0.85} />
                        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central"
                          fill="white" fontSize={width > 100 ? 13 : 10} fontWeight="600">{name}</text>
                      </g>
                    ) : (
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} opacity={0.7} />
                    )
                  )}
                />
              </ResponsiveContainer>
            </div>

            {/* Tech Stack */}
            <div className="bg-bc-card border border-bc-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Technology Stack</h3>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { name: 'Docling', desc: 'IBM text extraction', icon: '📄', status: '30,762 items' },
                  { name: 'BuildCode Vision', desc: 'LLaVA 34B local', icon: '👁️', status: 'Processing...' },
                  { name: 'Cost Matcher', desc: '61,259 item database', icon: '💰', status: 'Fuzzy matching' },
                  { name: 'CSI Classifier', desc: '22 division taxonomy', icon: '🏗️', status: 'Auto-classify' },
                ].map(tech => (
                  <div key={tech.name} className="bg-bc-darker rounded-lg p-4 border border-bc-border/50">
                    <div className="text-2xl mb-2">{tech.icon}</div>
                    <div className="font-semibold text-sm">{tech.name}</div>
                    <div className="text-bc-muted text-xs mt-1">{tech.desc}</div>
                    <div className="text-bc-green text-xs mt-2 font-medium">{tech.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'disciplines' && (
          <div className="grid md:grid-cols-2 gap-4">
            {discArray.map((d) => (
              <div key={d.key} className="bg-bc-card border border-bc-border rounded-xl p-6 hover:border-bc-accent/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ background: d.color }} />
                  <h3 className="text-lg font-bold">{d.name}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{d.items.toLocaleString()}</div>
                    <div className="text-bc-muted text-xs">Items</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{d.pages}</div>
                    <div className="text-bc-muted text-xs">Pages</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{d.extraction_time > 0 ? `${Math.round(d.extraction_time)}s` : '—'}</div>
                    <div className="text-bc-muted text-xs">Time</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-bc-muted truncate">{d.source_file}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            {/* Search & Filter */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bc-muted" />
                <input type="text" placeholder="Search extracted items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-bc-card border border-bc-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-bc-accent" />
              </div>
              <select value={selectedDiscipline} onChange={e => setSelectedDiscipline(e.target.value)}
                className="bg-bc-card border border-bc-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-bc-accent">
                <option value="all">All Disciplines</option>
                {discArray.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
              </select>
            </div>

            <div className="text-sm text-bc-muted mb-4">{filteredItems.length.toLocaleString()} items shown</div>

            {/* Items Table */}
            <div className="bg-bc-card border border-bc-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bc-border bg-bc-darker">
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Page</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Discipline</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Content</th>
                    <th className="text-left px-4 py-3 text-bc-muted font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.slice(0, 100).map((item, i) => (
                    <tr key={i} className="border-b border-bc-border/50 hover:bg-bc-border/20 transition-colors">
                      <td className="px-4 py-3 text-bc-muted">{item.page}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: `${COLORS[discArray.findIndex(d => d.key === item.discipline) % COLORS.length]}20`,
                          color: COLORS[discArray.findIndex(d => d.key === item.discipline) % COLORS.length]
                        }}>{item.discipline}</span>
                      </td>
                      <td className="px-4 py-3 text-bc-muted text-xs">{item.type?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 max-w-md truncate">{item.content}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-bc-darker rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-bc-green" style={{ width: `${(item.confidence || 0) * 100}%` }} />
                          </div>
                          <span className="text-xs text-bc-muted">{Math.round((item.confidence || 0) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredItems.length > 100 && (
                <div className="px-4 py-3 text-center text-bc-muted text-sm border-t border-bc-border">
                  Showing 100 of {filteredItems.length.toLocaleString()} items
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-bc-border py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-sm text-bc-muted">
          <span>⚡ BuildCode Ltd. · Extruction Engine v2.0</span>
          <span>Powered by BuildCode Vision (LLaVA 34B) · 100% Local Processing</span>
        </div>
      </footer>
    </div>
  );
}
