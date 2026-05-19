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
    <div className="eb-pipeline">
      {PIPELINE_NODES.map((node, i) => {
        const status = nodeStatus(node.id, pipeline);
        const isSkipped = status === 'skipped';
        return (
          <div key={node.id}>
            <div className={`eb-pipeline-node ${status} ${isSkipped ? 'skipped' : ''}`}>
              <div className="eb-node-dot" />
              <div className="eb-node-text">
                <span className="eb-node-label">{node.label}</span>
                <span className="eb-node-model">{node.model}</span>
              </div>
              {status === 'active' && <Loader2 className="eb-icon-spin" style={{color: 'var(--color-blue-500)'}} />}
              {status === 'done' && <CheckCircle2 className="eb-icon-small" style={{color: 'var(--color-slate-300)'}} />}
              {isSkipped && <span style={{fontSize: '0.75rem', color: 'var(--color-slate-400)'}}>skipped</span>}
            </div>
            {i < PIPELINE_NODES.length - 1 && (
              <div className="eb-node-connector" />
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
    <div className="eb-result-grid">
      {/* Left: Blast Radius */}
      <div>
        <h3 className="eb-card-title">Blast Radius</h3>
        {!response ? (
          <div className="eb-info-box">
            <p style={{fontSize: '0.85rem', color: 'var(--color-slate-500)'}}>No deep analysis — severity below escalation threshold.</p>
            <p className="eb-info-box-mono">
              {classification.severity.toUpperCase()} | CVSS below 7.0 | routed: cheap model only
            </p>
          </div>
        ) : (
          <div className="eb-pipeline">
            {response.affected_services.map((svc) => (
              <div key={svc.name} className="eb-service-card">
                <div className="eb-service-header">
                  <span className="eb-service-name">{svc.name}</span>
                  {svc.adr_reference && (
                    <span className="eb-tag eb-tag-adr">{svc.adr_reference}</span>
                  )}
                  {svc.incident_reference && (
                    <span className="eb-tag eb-tag-inc">{svc.incident_reference}</span>
                  )}
                </div>
                <p className="eb-service-reason">{svc.reason}</p>
              </div>
            ))}
            <div className="eb-summary-box">
              <p className="eb-summary-text">{response.blast_radius_summary}</p>
              <span className={`eb-tag ${
                response.confidence === 'high' ? 'eb-tag-confidence-high' :
                response.confidence === 'medium' ? 'eb-tag-confidence-medium' :
                'eb-tag-confidence-low'
              }`}>confidence: {response.confidence}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Memory Highlights + Remediation */}
      <div className="eb-pipeline" style={{gap: 'var(--space-6)'}}>
        {/* Memory Highlights — top priority */}
        {response && (
          <div>
            <h3 className="eb-card-title">Memory Highlights</h3>
            <div className="eb-pipeline">
              {response.affected_services
                .filter(s => s.adr_reference || s.incident_reference)
                .map((svc, i) => (
                  <div key={i} className="eb-highlight eb-highlight-adr">
                    <span className="eb-highlight-ref">
                      {svc.adr_reference ?? svc.incident_reference}
                    </span>
                    <p className="eb-highlight-desc">{svc.reason}</p>
                  </div>
                ))}
              {response.similar_past_incident && (
                <div className="eb-highlight eb-highlight-inc">
                  <span className="eb-highlight-ref">
                    {response.similar_past_incident.incident_id}
                  </span>
                  <p className="eb-highlight-desc">{response.similar_past_incident.similarity_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remediation Steps */}
        {response && (
          <div>
            <h3 className="eb-card-title">Remediation Steps</h3>
            <div className="eb-pipeline">
              {response.remediation_steps.map((step) => (
                <div key={step.step} className="eb-step">
                  <span className="eb-step-num">{step.step}.</span>
                  <div className="eb-step-content">
                    <p className="eb-step-action">{step.action}</p>
                    <div className="eb-step-meta">
                      <span>{step.owner}</span>
                      <span className="eb-step-meta-dot">·</span>
                      <span>{step.estimated_effort}</span>
                    </div>
                    {step.architectural_constraint && (
                      <div className="eb-step-constraint">
                        {step.architectural_constraint}
                      </div>
                    )}
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
  const [sessionCVEIds, setSessionCVEIds] = useState<string[]>([]);
  const [hindsightConnected, setHindsightConnected] = useState<boolean | null>(null);

  // Memory Explorer state
  const [memoryBank, setMemoryBank] = useState<string>('architecture-decisions');
  const [memoryResult, setMemoryResult] = useState<string>('');
  const [memoryLoading, setMemoryLoading] = useState(false);

  // Handoff state
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffResult, setHandoffResult] = useState<HandoffBriefing | null>(null);

  // Config state
  const [budgetValue, setBudgetValue] = useState('0.10');

  // Check Hindsight health on mount
  useEffect(() => {
    fetch('/api/memory', { method: 'HEAD' })
      .then(res => setHindsightConnected(res.ok))
      .catch(() => setHindsightConnected(false));
  }, []);

  async function handleAnalyze() {
    if (!selectedCVE || pipeline.stage !== 'idle') return;

    setPipeline({ stage: 'classifying' });
    setResult(null);

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
    setSessionCost(prev => prev + (data.routed_to_strong_model ? 0.003 : 0.0002));
  }

  async function handleMemoryQuery() {
    setMemoryLoading(true);
    const res = await fetch(`/api/memory?bank=${encodeURIComponent(memoryBank)}&query=all+entries`);
    const data = await res.json();
    setMemoryResult(data.result ?? 'No entries found.');
    setMemoryLoading(false);
  }

  async function handleGenerateHandoff() {
    setHandoffLoading(true);
    const res = await fetch('/api/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_start: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        cve_ids: sessionCVEIds,
      }),
    });
    const data: HandoffBriefing = await res.json();
    setHandoffResult(data);
    setHandoffLoading(false);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'triage',  label: 'Triage',          icon: <Shield className="eb-icon-small" /> },
    { id: 'memory',  label: 'Memory Explorer', icon: <Database className="eb-icon-small" /> },
    { id: 'handoff', label: 'Shift Handoff',   icon: <FileText className="eb-icon-small" /> },
    { id: 'config',  label: 'Config',          icon: <Settings className="eb-icon-small" /> },
  ];

  return (
    <div className="eb-app-container">
      {/* Sidebar */}
      <aside className="eb-sidebar">
        <div className="eb-sidebar-header">
          <span className="eb-sidebar-title">EBOps</span>
          <span className="eb-sidebar-subtitle">Engineering Ops Brain</span>
        </div>
        <nav className="eb-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`eb-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="eb-sidebar-footer">
          <div className="eb-status-indicator">
            <div className={`eb-status-dot ${
              hindsightConnected === null ? 'checking' :
              hindsightConnected ? 'online' : 'offline'
            }`} />
            <span>
              {hindsightConnected === null ? 'Checking...' :
               hindsightConnected ? 'Hindsight connected' : 'Hindsight offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="eb-main-wrapper">
        <header className="eb-header">
          <div className="eb-header-breadcrumb">
            <span>EBOps</span>
            <ChevronRight className="eb-icon-small" />
            <span className="current">{activeTab}</span>
          </div>
          <div className="eb-header-meta">
            <span className="eb-cost-tracker">
              Session Cost: <span>${sessionCost.toFixed(4)}</span>
            </span>
            <div className={`eb-connection-badge ${hindsightConnected ? 'online' : 'offline'}`}>
              <div className={`eb-status-dot ${hindsightConnected ? 'online' : 'offline'}`} />
              Hindsight {hindsightConnected ? 'Connected' : 'Offline'}
            </div>
          </div>
        </header>

        <main className="eb-main-content">
          {/* Triage Tab */}
          {activeTab === 'triage' && (
            <div className="eb-grid-triage">
              <div className="eb-pipeline">
                <div className="eb-card">
                  <label className="eb-label">Select CVE</label>
                  <select
                    className="eb-select"
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
                    <p className="eb-cve-desc">{selectedCVE.description}</p>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!selectedCVE || pipeline.stage !== 'idle'}
                    className="eb-btn-primary"
                    style={{ marginTop: 'var(--space-4)' }}
                  >
                    {pipeline.stage === 'idle' ? 'Analyze CVE' : 'Analyzing...'}
                  </button>
                </div>

                <div className="eb-card" style={{ marginTop: 'var(--space-6)' }}>
                  <label className="eb-label" style={{ marginBottom: 'var(--space-4)' }}>Pipeline Activity</label>
                  <PipelineVisualizer pipeline={pipeline} />
                  
                  {pipeline.stage === 'done' && (
                    <div className="eb-cost-box">
                      <div className="eb-cost-row">
                        <span>Cheap model</span>
                        <span>~$0.0002</span>
                      </div>
                      {pipeline.escalated && (
                        <div className="eb-cost-row">
                          <span>Strong model</span>
                          <span>~$0.0031</span>
                        </div>
                      )}
                      <div className="eb-cost-total">
                        <span>This query</span>
                        <span>${pipeline.escalated ? '0.0033' : '0.0002'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                {!result ? (
                  <div className="eb-result-empty">
                    <p>Select a CVE and click Analyze to view deep context</p>
                  </div>
                ) : (
                  <ResultPanel result={result} />
                )}
              </div>
            </div>
          )}

          {/* Memory Explorer Tab */}
          {activeTab === 'memory' && (
            <div className="eb-card eb-max-w-3xl">
              <h2 className="eb-card-title">Memory Explorer</h2>
              <div className="eb-flex eb-gap-2 eb-mb-4">
                {['architecture-decisions', 'past-incidents', 'cve-responses'].map(bank => (
                  <button
                    key={bank}
                    onClick={() => setMemoryBank(bank)}
                    className={`eb-btn-secondary ${memoryBank === bank ? 'active' : ''}`}
                    style={memoryBank === bank ? { background: 'var(--color-slate-900)', color: 'white', borderColor: 'var(--color-slate-900)' } : {}}
                  >
                    {bank}
                  </button>
                ))}
                <button
                  onClick={handleMemoryQuery}
                  disabled={memoryLoading}
                  className="eb-btn-secondary"
                  style={{ marginLeft: 'auto' }}
                >
                  {memoryLoading ? 'Loading...' : 'Fetch Memory'}
                </button>
              </div>
              
              <div className="eb-pre" style={{ minHeight: '250px' }}>
                {memoryResult ? memoryResult : 'Select a bank and click Fetch to view internal architectural memories.'}
              </div>

              {sessionCVEIds.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)', color: 'var(--color-blue-700)', background: 'var(--color-blue-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  {sessionCVEIds.length} new {sessionCVEIds.length === 1 ? 'entry' : 'entries'} added this session: {sessionCVEIds.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Handoff Tab */}
          {activeTab === 'handoff' && (
            <div className="eb-card eb-max-w-2xl">
              <div className="eb-flex eb-items-center eb-justify-between eb-mb-6">
                <div>
                  <h2 className="eb-card-title" style={{ marginBottom: 'var(--space-1)', fontSize: '1rem', textTransform: 'none' }}>Shift Handoff Briefing</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    {sessionCVEIds.length > 0
                      ? `${sessionCVEIds.length} CVEs analyzed this session: ${sessionCVEIds.join(', ')}`
                      : 'No CVEs analyzed this session yet.'}
                  </p>
                </div>
                <button
                  onClick={handleGenerateHandoff}
                  disabled={handoffLoading}
                  className="eb-btn-primary"
                  style={{ width: 'auto' }}
                >
                  {handoffLoading && <Loader2 className="eb-icon-spin" />}
                  Generate Briefing
                </button>
              </div>

              {handoffResult ? (
                <div className="eb-info-box">
                  <div className="eb-flex eb-items-center eb-justify-between" style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-slate-200)' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate-500)' }}>
                      Generated {new Date(handoffResult.generated_at).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>{handoffResult.cves_triaged} CVEs covered</span>
                  </div>
                  <pre style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--color-slate-700)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {handoffResult.full_narrative}
                  </pre>
                </div>
              ) : (
                <div className="eb-result-empty" style={{ flexDirection: 'column', padding: 'var(--space-10)' }}>
                  <FileText style={{ width: '32px', height: '32px', opacity: 0.3, marginBottom: 'var(--space-2)' }} />
                  <p>Click Generate Briefing to create the shift handoff document.</p>
                </div>
              )}
            </div>
          )}

          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="eb-max-w-lg eb-pipeline" style={{ gap: 'var(--space-6)' }}>
              <div className="eb-card">
                <h3 className="eb-card-title">Hindsight Database</h3>
                <div className="eb-flex eb-items-center eb-justify-between">
                  <span className="eb-font-mono eb-text-sm" style={{ color: 'var(--color-slate-700)' }}>
                    {process.env.NEXT_PUBLIC_HINDSIGHT_BASE_URL ?? 'api.hindsight.vectorize.io'}
                  </span>
                  <div className="eb-flex eb-items-center eb-gap-2 eb-text-xs" style={{ color: hindsightConnected ? 'var(--color-green-600)' : 'var(--color-red-600)' }}>
                    {hindsightConnected
                      ? <><CheckCircle2 className="eb-icon-small" /> Connected</>
                      : <><XCircle className="eb-icon-small" /> Offline</>
                    }
                  </div>
                </div>
              </div>

              <div className="eb-card">
                <h3 className="eb-card-title">Budget Cap (USD per run)</h3>
                <div className="eb-flex eb-gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={budgetValue}
                    onChange={e => setBudgetValue(e.target.value)}
                    className="eb-input"
                    style={{ width: '120px' }}
                  />
                  <button className="eb-btn-secondary">Update</button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', margin: 'var(--space-2) 0 0 0' }}>cascadeflow stops the pipeline if this budget is exceeded.</p>
              </div>

              <div className="eb-card">
                <h3 className="eb-card-title">Model Routing</h3>
                <div className="eb-flex eb-items-center eb-gap-4">
                  <div className="eb-input eb-font-mono eb-text-xs" style={{ background: 'var(--color-slate-50)', color: 'var(--color-slate-600)', width: 'auto' }}>
                    {process.env.CASCADE_CHEAP_MODEL ?? 'llama3-8b-8192'}
                  </div>
                  <ChevronRight className="eb-icon-small" style={{ color: 'var(--color-slate-400)' }} />
                  <div className="eb-input eb-font-mono eb-text-xs" style={{ background: 'var(--color-slate-900)', color: 'white', width: 'auto' }}>
                    {process.env.CASCADE_STRONG_MODEL ?? 'qwen-qwq-32b'}
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', margin: 'var(--space-2) 0 0 0' }}>Escalates when CVSS ≥ 7.0 or network + low complexity.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
