/**
 * Prometheus-style in-process metrics for the orchestrator.
 */

export interface CounterSample  { labels: Record<string, string>; value: number }
export interface HistogramSample { labels: Record<string, string>; count: number; sum: number; buckets: Record<number, number> }
export interface GaugeSample     { labels: Record<string, string>; value: number }

// ============================================================================
// Counter
// ============================================================================

export class Counter {
  private samples = new Map<string, CounterSample>();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[]
  ) {}

  inc(labels: Record<string, string>, value = 1): void {
    const key = JSON.stringify(labels);
    const existing = this.samples.get(key);
    if (existing) { existing.value += value; }
    else { this.samples.set(key, { labels, value }); }
  }

  collect(): CounterSample[] { return Array.from(this.samples.values()); }
  reset(): void { this.samples.clear(); }
}

// ============================================================================
// Gauge
// ============================================================================

export class Gauge {
  private samples = new Map<string, GaugeSample>();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[]
  ) {}

  set(labels: Record<string, string>, value: number): void {
    this.samples.set(JSON.stringify(labels), { labels, value });
  }

  collect(): GaugeSample[] { return Array.from(this.samples.values()); }
}

// ============================================================================
// Histogram
// ============================================================================

const DEFAULT_BUCKETS = [1, 5, 15, 30, 60, 120, 300, 600];

export class Histogram {
  private samples = new Map<string, HistogramSample>();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[],
    public readonly buckets: number[] = DEFAULT_BUCKETS
  ) {}

  observe(labels: Record<string, string>, value: number): void {
    const key = JSON.stringify(labels);
    let sample = this.samples.get(key);
    if (!sample) {
      const bucketsMap: Record<number, number> = {};
      this.buckets.forEach((b) => { bucketsMap[b] = 0; });
      sample = { labels, count: 0, sum: 0, buckets: bucketsMap };
      this.samples.set(key, sample);
    }
    sample.count++;
    sample.sum += value;
    for (const b of this.buckets) {
      if (value <= b) sample.buckets[b]++;
    }
  }

  collect(): HistogramSample[] { return Array.from(this.samples.values()); }
}

// ============================================================================
// Orchestrator Metrics
// ============================================================================

export const stageDurationSeconds = new Histogram(
  'manipula_stage_duration_seconds', 'Stage completion time',
  ['stage', 'agent', 'status'], [1, 5, 15, 30, 60, 120, 300, 600]
);

export const tokensTotal = new Counter(
  'manipula_tokens_total', 'Tokens consumed',
  ['model', 'stage', 'direction']
);

export const budgetUtilizationRatio = new Gauge(
  'manipula_budget_utilization_ratio', 'Budget spent / limit',
  ['project_id']
);

export const qaIterationsCount = new Histogram(
  'manipula_qa_iterations_count', 'QA iterations before pass/fail',
  [], [1, 2, 3]
);

export const modelSelectionsTotal = new Counter(
  'manipula_model_selections_total', 'Model selection events',
  ['model', 'tier', 'reason']
);

export const stagesTotal = new Counter(
  'manipula_stages_total', 'Stage execution events',
  ['stage', 'status']
);
