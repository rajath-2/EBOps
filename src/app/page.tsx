'use client';

import { useState, useEffect } from 'react';
import { Shield, Database, FileText, Settings, ChevronRight, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { syntheticCVEs } from '@/data/cves';
import type { CVEEvent, Classification, CVEResponse } from '@/memory/types';
import type { HandoffBriefing } from '@/agent/handoff';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'triage' | 'memory' | 'handoff' | 'config';

type PipelineStage = 'idle' | 'classifying' | 'retaining-1' | 'analyzing' | 'retaining-2' | 'done';

interface PipelineState {
  stage: PipelineStage;
  escalated?: boolean;
  classificationCost?: number;
  analysisCost?: number;
}

interface AnalysisResult {
  cve_id: string;
  classification: Classification;
  response: CVEResponse | null;
  routed_to_strong_model: boolean;
}

// ─── Pipeline Visualizer ─────────────────────────────────────────────────────

const PIPELINE_NODES = [
  { id: 'classifying',  label: 'Triage',   model: 'llama3-8b',  tier: 'cheap'  },
  { id: 'retaining-1', label: 'Retain',    model: 'Hindsight',  tier: 'memory' },
  { id: 'analyzing',   label: 'Analysis',  model: 'qwen3-32b',  tier: 'strong' },
  { id: 'retaining-2', label: 'Retain',    model: 'Hindsight',  tier: 'memory' },
] as const;

function nodeStatus(nodeId: string, pipeline: PipelineState): 'idle' | 'active' | 'done' | 'skipped' {
  const order = ['classifying', 'retaining-1', 'analyzing', 'retaining-2', 'done'];
  const current = order.indexOf(pipeline.stage);
  const node = order.indexOf(nodeId);
  if (pipeline.stage === 'idle') return 'idle';
  if (node < current) return 'done';
  if (node === current) return 'active';
  if (!pipeline.escalated && (nodeId === 'analyzing' || nodeId === 'retaining-2')) return 'skipped';
  return 'idle';
}

function PipelineVisualizer({ pipeline }: { pipeline: PipelineState }) {
  return (
    <div className="flex flex-col gap-0">
      {PIPELINE_NODES.map((node, i) => {
        const status = nodeStatus(node.id, pipeline);
        const isSkipped = status === 'skipped';
        return (
          <div key={node.id}>
            <div className={`flex items-center gap-3 p-3 border rounded transition-all duration-300 ${
              status === 'active' ? 'border-blue-400 bg-blue-50' :
              status === 'done'   ? 'border-slate-900 bg-slate-900' :
              isSkipped           ? 'border-slate-100 bg-slate-50 opacity-40' :
                                    'border-slate-200 bg-white'
            }`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                status === 'active' ? 'bg-blue-500 animate-pulse' :
                status === 'done'   ? 'bg-white' :
                isSkipped           ? 'bg-slate-300' :
                                      'bg-slate-200'
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${
                  status === 'done' ? 'text-white' :
                  status === 'active' ? 'text-blue-700' :
                  'text-slate-500'
                }`}>{node.label}</span>
                <span className={`ml-2 text-xs font-mono ${
                  status === 'done' ? 'text-slate-300' :
                  status === 'active' ? 'text-blue-500' :
                  'text-slate-400'
                }`}>{node.model}</span>
              </div>
              {status === 'active' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin flex-shrink-0" />}
              {status === 'done' && <CheckCircle2 className="w-3 h-3 text-slate-300 flex-shrink-0" />}
              {isSkipped && <span className="text-xs text-slate-400">skipped</span>}
            </div>
            {i < PIPELINE_NODES.length - 1 && (
              <div className="w-px h-3 bg-slate-200 ml-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Result Panel ─────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: AnalysisResult }) {
  const { classification, response } = result;
  return (
    <div className="grid grid-cols-2 gap-6 mt-6">
      {/* Left: Blast Radius */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Blast Radius</h3>
        {!response ? (
          <div className="border border-slate-200 rounded p-4">
            <p className="text-sm text-slate-500">No deep analysis — severity below escalation threshold.</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {classification.severity.toUpperCase()} | CVSS below 7.0 | routed: cheap model only
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {response.affected_services.map((svc) => (
              <div key={svc.name} className="border border-slate-200 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">{svc.name}</span>
                  {svc.adr_reference && (
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{svc.adr_reference}</span>
                  )}
                  {svc.incident_reference && (
                    <span className="font-mono text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{svc.incident_reference}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{svc.reason}</p>
              </div>
            ))}
            <div className="border border-slate-200 rounded p-3 mt-1">
              <p className="text-xs text-slate-600">{response.blast_radius_summary}</p>
              <span className={`mt-1 inline-block text-xs font-mono px-1.5 py-0.5 rounded ${
                response.confidence === 'high' ? 'bg-green-50 text-green-700' :
                response.confidence === 'medium' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              }`}>confidence: {response.confidence}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Memory Highlights + Remediation */}
      <div className="flex flex-col gap-4">
        {/* Memory Highlights — top priority */}
        {response && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Memory Highlights</h3>
            <div className="flex flex-col gap-2">
              {response.affected_services
                .filter(s => s.adr_reference || s.incident_reference)
                .map((svc, i) => (
                  <div key={i} className="border-l-2 border-blue-500 pl-3 py-1">
                    <span className="font-mono text-xs text-blue-700 font-semibold">
                      {svc.adr_reference ?? svc.incident_reference}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{svc.reason}</p>
                  </div>
                ))}
              {response.similar_past_incident && (
                <div className="border-l-2 border-amber-400 pl-3 py-1">
                  <span className="font-mono text-xs text-amber-700 font-semibold">
                    {response.similar_past_incident.incident_id}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">{response.similar_past_incident.similarity_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remediation Steps */}
        {response && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Remediation Steps</h3>
            <div className="flex flex-col gap-2">
              {response.remediation_steps.map((step) => (
                <div key={step.step} className="border border-slate-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs text-slate-400 flex-shrink-0 mt-0.5">{step.step}.</span>
                    <div className="flex-1">
                      <p className="text-xs text-slate-700">{step.action}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-slate-400">{step.owner}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{step.estimated_effort}</span>
                      </div>
                      {step.architectural_constraint && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          <p className="text-xs text-amber-700">{step.architectural_constraint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('triage');
  const [selectedCVE, setSelectedCVE] = useState<CVEEvent | null>(null);
  const [pipeline, setPipeline] = useState<PipelineState>({ stage: 'idle' });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const [sessionCVEIds, setSessionCVEIds] = useState<string[]>([]); // ← tracks CVEs for handoff
  const [hindsightConnected, setHindsightConnected] = useState<boolean | null>(null);

  // Memory Explorer state
  const [memoryBank, setMemoryBank] = useState<string>('architecture-decisions');
  const [memoryResult, setMemoryResult] = useState<string>('');
  const [memoryLoading, setMemoryLoading] = useState(false);

  // Handoff state
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffResult, setHandoffResult] = useState<HandoffBriefing | null>(null);

  // Config state
  const [budgetValue, setBudgetValue] = useState('0.10'); // ← controlled input, not defaultValue

  // Check Hindsight health on mount
  useEffect(() => {
    fetch('/api/memory', { method: 'HEAD' })
      .then(res => setHindsightConnected(res.ok))
      .catch(() => setHindsightConnected(false));
  }, []);

  // ── Triage handler ──────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!selectedCVE || pipeline.stage !== 'idle') return;

    setPipeline({ stage: 'classifying' });
    setResult(null);

    // Simulate pipeline stage transitions for the visualizer
    await new Promise(r => setTimeout(r, 600));
    setPipeline(p => ({ ...p, stage: 'retaining-1' }));
    await new Promise(r => setTimeout(r, 400));
    setPipeline(p => ({ ...p, stage: 'analyzing' }));

    const res = await fetch('/api/cve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedCVE),
    });

    const data: AnalysisResult = await res.json();

    if (data.routed_to_strong_model) {
      setPipeline(p => ({ ...p, stage: 'retaining-2', escalated: true }));
      await new Promise(r => setTimeout(r, 400));
    }

    setPipeline({ stage: 'done', escalated: data.routed_to_strong_model });
    setResult(data);
    setSessionCVEIds(prev => Array.from(new Set([...prev, data.cve_id])));
    // Estimate cost — replace with real cascadeflow trace data when available
    setSessionCost(prev => prev + (data.routed_to_strong_model ? 0.003 : 0.0002));
  }

  // ── Memory Explorer handler ─────────────────────────────────────────────────
  async function handleMemoryQuery() {
    setMemoryLoading(true);
    const res = await fetch(`/api/memory?bank=${encodeURIComponent(memoryBank)}&query=all+entries`);
    const data = await res.json();
    setMemoryResult(data.result ?? 'No entries found.');
    setMemoryLoading(false);
  }

  // ── Handoff handler ─────────────────────────────────────────────────────────
  async function handleGenerateHandoff() {
    setHandoffLoading(true);
    const res = await fetch('/api/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_start: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8h ago
        cve_ids: sessionCVEIds,
      }),
    });
    const data: HandoffBriefing = await res.json();
    setHandoffResult(data);
    setHandoffLoading(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'triage',  label: 'Triage',          icon: <Shield className="w-4 h-4" /> },
    { id: 'memory',  label: 'Memory Explorer',  icon: <Database className="w-4 h-4" /> },
    { id: 'handoff', label: 'Shift Handoff',    icon: <FileText className="w-4 h-4" /> },
    { id: 'config',  label: 'Config',           icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-slate-900 flex-shrink-0 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <span className="font-mono text-sm font-semibold text-white tracking-tight">EBOps</span>
          <span className="block text-xs text-slate-500 mt-0.5">Engineering Ops Brain</span>
        </div>
        <nav className="flex-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-l-2 border-blue-500 text-white bg-slate-800'
                  : 'border-l-2 border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              hindsightConnected === null ? 'bg-slate-500' :
              hindsightConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-xs text-slate-500">
              {hindsightConnected === null ? 'Checking...' :
               hindsightConnected ? 'Hindsight connected' : 'Hindsight offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <span>EBOps</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
              Session Cost: <span className="font-mono text-slate-900">${sessionCost.toFixed(4)}</span>
            </span>
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              hindsightConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${hindsightConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              Hindsight {hindsightConnected ? 'Connected' : 'Offline'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── Triage Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'triage' && (
            <div className="grid grid-cols-3 gap-6">
              {/* Left: Input + Pipeline */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Select CVE
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-400"
                    onChange={e => {
                      const cve = syntheticCVEs.find(c => c.cve_id === e.target.value) ?? null;
                      setSelectedCVE(cve);
                      setPipeline({ stage: 'idle' });
                      setResult(null);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Choose a CVE...</option>
                    {syntheticCVEs.map(cve => (
                      <option key={cve.cve_id} value={cve.cve_id}>
                        {cve.cve_id} — CVSS {cve.cvss_score}
                      </option>
                    ))}
                  </select>
                  {selectedCVE && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">{selectedCVE.description}</p>
                  )}
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!selectedCVE || pipeline.stage !== 'idle'}
                  className="w-full bg-slate-900 text-white text-sm py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  {pipeline.stage === 'idle' ? 'Analyze CVE' : 'Analyzing...'}
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Pipeline
                  </label>
                  <PipelineVisualizer pipeline={pipeline} />
                </div>

                {pipeline.stage === 'done' && (
                  <div className="border border-slate-200 rounded p-3 text-xs">
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Cheap model</span>
                      <span className="font-mono">~$0.0002</span>
                    </div>
                    {pipeline.escalated && (
                      <div className="flex justify-between text-slate-500">
                        <span>Strong model</span>
                        <span className="font-mono">~$0.0031</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-medium mt-2 pt-2 border-t border-slate-100">
                      <span>This query</span>
                      <span className="font-mono">${pipeline.escalated ? '0.0033' : '0.0002'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Result (spans 2 cols) */}
              <div className="col-span-2">
                {!result ? (
                  <div className="h-full flex items-center justify-center text-slate-300 border border-dashed border-slate-200 rounded">
                    <p className="text-sm">Select a CVE and click Analyze</p>
                  </div>
                ) : (
                  <ResultPanel result={result} />
                )}
              </div>
            </div>
          )}

          {/* ── Memory Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'memory' && (
            <div className="max-w-3xl">
              <div className="flex gap-2 mb-4">
                {['architecture-decisions', 'past-incidents', 'cve-responses'].map(bank => (
                  <button
                    key={bank}
                    onClick={() => setMemoryBank(bank)}
                    className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                      memoryBank === bank
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
                <button
                  onClick={handleMemoryQuery}
                  disabled={memoryLoading}
                  className="ml-auto text-xs px-3 py-1.5 border border-slate-200 rounded hover:border-slate-400 transition-colors disabled:opacity-40"
                >
                  {memoryLoading ? 'Loading...' : 'Fetch'}
                </button>
              </div>
              <div className="border border-slate-200 rounded p-4 min-h-64">
                {memoryResult ? (
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{memoryResult}</pre>
                ) : (
                  <p className="text-sm text-slate-400">Select a bank and click Fetch to view memories.</p>
                )}
              </div>
              {sessionCVEIds.length > 0 && (
                <div className="mt-3 text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded px-3 py-2">
                  {sessionCVEIds.length} new {sessionCVEIds.length === 1 ? 'entry' : 'entries'} added this session: {sessionCVEIds.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* ── Handoff Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'handoff' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Shift Handoff Briefing</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sessionCVEIds.length > 0
                      ? `${sessionCVEIds.length} CVEs analyzed this session: ${sessionCVEIds.join(', ')}`
                      : 'No CVEs analyzed this session yet.'}
                  </p>
                </div>
                {/* 🔧 FIX: onClick is wired to handleGenerateHandoff — not a stub */}
                <button
                  onClick={handleGenerateHandoff}
                  disabled={handoffLoading}
                  className="bg-slate-900 text-white text-sm px-4 py-2 rounded disabled:opacity-40 hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  {handoffLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Generate Briefing
                </button>
              </div>

              {handoffResult ? (
                <div className="bg-slate-50 border border-slate-200 rounded p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                    <span className="text-xs font-mono text-slate-500">
                      Generated {new Date(handoffResult.generated_at).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">{handoffResult.cves_triaged} CVEs covered</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {handoffResult.full_narrative}
                  </pre>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded p-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Click Generate Briefing to create the shift handoff document.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Config Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'config' && (
            <div className="max-w-lg flex flex-col gap-6">
              <div className="border border-slate-200 rounded p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hindsight</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-mono text-xs">
                    {process.env.NEXT_PUBLIC_HINDSIGHT_BASE_URL ?? 'api.hindsight.vectorize.io'}
                  </span>
                  <div className={`flex items-center gap-1.5 text-xs ${hindsightConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {hindsightConnected
                      ? <><CheckCircle2 className="w-3 h-3" /> Connected</>
                      : <><XCircle className="w-3 h-3" /> Offline</>
                    }
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Budget Cap (USD per run)</h3>
                {/* 🔧 FIX: controlled input — value + onChange, not defaultValue */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={budgetValue}
                    onChange={e => setBudgetValue(e.target.value)}
                    className="border border-slate-200 rounded px-3 py-2 text-sm font-mono w-32 focus:outline-none focus:border-slate-400"
                  />
                  <button className="border border-slate-200 rounded px-3 py-2 text-sm hover:border-slate-400 transition-colors">
                    Update
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">cascadeflow stops the pipeline if this budget is exceeded.</p>
              </div>

              <div className="border border-slate-200 rounded p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Model Routing</h3>
                <div className="flex items-center gap-3">
                  <div className="border border-slate-200 rounded px-3 py-2 font-mono text-xs text-slate-600">
                    {process.env.CASCADE_CHEAP_MODEL ?? 'llama3-8b-8192'}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <div className="border border-slate-900 rounded px-3 py-2 font-mono text-xs text-slate-900 bg-slate-50">
                    {process.env.CASCADE_STRONG_MODEL ?? 'qwen-qwq-32b'}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Escalates when CVSS ≥ 7.0 or network + low complexity.</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
