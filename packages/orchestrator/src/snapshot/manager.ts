/**
 * Snapshot manager — content-addressed S3/MinIO storage for project state snapshots.
 */

import { createHash } from 'crypto';
import { OrchestratorProjectState } from '@manipula/shared';

export interface S3Client {
  putObject(params: { Bucket: string; Key: string; Body: Buffer }): Promise<void>;
  getObject(params: { Bucket: string; Key: string }): Promise<Buffer>;
}

export interface SnapshotManagerConfig {
  bucket: string;
  endpoint?: string;
  region?: string;
}

/**
 * Manages content-addressed snapshots of project state.
 * Key format: `snapshots/{project_id}/v{version}-{sha256[:12]}.json`
 */
export class SnapshotManager {
  constructor(
    private readonly s3: S3Client,
    private readonly config: SnapshotManagerConfig
  ) {}

  async snapshot(state: OrchestratorProjectState): Promise<string> {
    const content = JSON.stringify(state);
    const checksum = createHash('sha256').update(content).digest('hex').slice(0, 12);
    const key = `snapshots/${state.meta.id}/v${state.meta.version}-${checksum}.json`;

    await this.s3.putObject({
      Bucket: this.config.bucket,
      Key: key,
      Body: Buffer.from(content),
    });

    state.meta.snapshot_key = key;
    if (!state.meta.rollback_history.includes(key)) {
      state.meta.rollback_history.push(key);
    }

    return key;
  }

  async load(snapshotKey: string): Promise<OrchestratorProjectState> {
    const body = await this.s3.getObject({
      Bucket: this.config.bucket,
      Key: snapshotKey,
    });
    return JSON.parse(body.toString()) as OrchestratorProjectState;
  }

  buildKey(state: OrchestratorProjectState): string {
    const content = JSON.stringify(state);
    const checksum = createHash('sha256').update(content).digest('hex').slice(0, 12);
    return `snapshots/${state.meta.id}/v${state.meta.version}-${checksum}.json`;
  }
}
