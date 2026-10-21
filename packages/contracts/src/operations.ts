/** Public operational reports contain no credentials, request logs or user data. */
export type OperationState = "operational" | "degraded" | "outage" | "unknown";
export type ComponentId = "api" | "mcp" | "ingestion";
export interface OperationComponent {
  id: ComponentId;
  name: string;
  status: OperationState;
  detail: string;
  latency_ms?: number;
  coverage?: {
    total: number;
    fresh: number;
    stale: number;
    unavailable: number;
    failed_last_check: number;
    last_success_at: string | null;
  };
}
export interface OperationSnapshot {
  checked_at: string;
  status: OperationState;
  components: OperationComponent[];
}
export interface OperationStatus {
  generated_at: string;
  status: OperationState;
  monitoring: "current" | "delayed" | "starting" | "unavailable";
  interval_minutes: number;
  latest: OperationSnapshot | null;
  history: OperationSnapshot[];
}
