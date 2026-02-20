/**
 * Local node health checker for Ollama integration.
 */

export interface LocalNodeStatus {
  healthy: boolean;
  queueDepth: number;
  gpuUtilization: number;
}

/**
 * Represents a single Ollama local inference node.
 */
export class LocalNode {
  public queueDepth = 0;
  private lastHealthCheck = 0;
  private cachedHealth = false;
  private readonly cacheTtlMs = 5000;

  constructor(public readonly url: string) {}

  async isHealthy(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.cacheTtlMs) {
      return this.cachedHealth;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(`${this.url}/api/tags`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!resp.ok) {
        this.cachedHealth = false;
        this.lastHealthCheck = now;
        return false;
      }

      const metricsResp = await fetch(`${this.url}/metrics`, {
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);

      if (metricsResp?.ok) {
        const data = (await metricsResp.json()) as Record<string, number>;
        this.queueDepth = data['queue_depth'] ?? 0;
        const gpuUtil = data['gpu_utilization'] ?? 0;
        this.cachedHealth = gpuUtil < 0.90;
      } else {
        this.queueDepth = 0;
        this.cachedHealth = true;
      }

      this.lastHealthCheck = now;
      return this.cachedHealth;
    } catch {
      this.cachedHealth = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  async getStatus(): Promise<LocalNodeStatus> {
    const healthy = await this.isHealthy();
    return { healthy, queueDepth: this.queueDepth, gpuUtilization: 0 };
  }
}
