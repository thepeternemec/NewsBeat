import { z } from "zod";
export const PRIORITY_BEAT_IDS = ["b_bb964843350e", "b_7d5acdda6186", "b_a723a1d2787f", "b_c0c3f9282a94", "b_06c91290de1c", "b_edbc5b5af755"] as const;
export const PriorityBeatSchema = z.enum(PRIORITY_BEAT_IDS);
export const CollectionRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), beat_id: PriorityBeatSchema, interval_seconds: z.literal(60) }).strict(),
  z.object({ action: z.literal("stop"), beat_id: PriorityBeatSchema, session_token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  z.object({ action: z.literal("status"), beat_id: PriorityBeatSchema }).strict(),
]);
export interface CollectionStatus {
  beat_id: string; active: boolean; interval_seconds: 60; catalog_interval_seconds: 600;
  expires_at: string | null; last_attempt_at: string | null; last_success_at: string | null;
  last_error: string | null; duration_minutes: 15;
}
export interface CollectionResult extends CollectionStatus { started?: boolean; stopped?: boolean; session_token?: string }
