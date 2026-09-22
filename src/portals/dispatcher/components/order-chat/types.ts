/** Shared shapes for the order chat screen. */

export interface OrderChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: "customer" | "dispatcher" | "system" | "rider";
  type?: string;
  systemKind?: string;
  text: string;
  timestamp: number;
  /** Present on order_confirmation cards — the customer's approval. */
  confirmed?: boolean;
  /** Present on item_revision system messages. */
  status?: "pending" | "approved" | "rejected";
  [key: string]: any;
}

export interface StorePinpoint {
  id?: number;
  storeName: string;
  latitude: number;
  longitude: number;
  address?: string;
  orderIndex?: number;
  /**
   * Set when this stop came from the verified-places catalogue rather than a
   * Google result or a bare map click. Null in those cases, and the server
   * treats a stop without a placeId as uncomparable rather than guessing.
   */
  placeId?: string | null;
  categoryId?: number | null;
  /**
   * Where `categoryId` came from, so the UI can tell a confirmed category from
   * a guess. Client-side only - the server has no column for it, and a guess
   * that looks settled is worse than no guess, because ten server behaviours
   * read this field.
   */
  categorySource?: CategorySource;
  /**
   * Google's own `types` for this result, kept so the category service can use
   * them as a prior. Absent for a bare map click or a catalogue hit, which is
   * the normal case for most Tacurong shops.
   */
  googleTypes?: string[];
  /**
   * How sure the category service was, 0-1. Present only for a "model" guess.
   * Shown to the dispatcher rather than acted on: the decision to speak at all
   * was already made server-side against the confidence floor.
   */
  categoryConfidence?: number;
  /** The runner-up category name, so a correction is one glance not a list. */
  categoryRunnerUp?: string;
}

export type CategorySource =
  /** Chosen from our own catalogue - trustworthy. */
  | "catalogue"
  /** Resolved by reverse-lookup against the catalogue within 50 m - trustworthy. */
  | "reverse"
  /** Inferred from Google's place types - a guess. */
  | "google"
  /** Inferred by matching the name against the catalogue - a guess. */
  | "name"
  /** Read from the shop name by the category service (server/ml) - a guess. */
  | "model"
  /** The dispatcher picked it. */
  | "manual"
  | null;

export interface EditableItem {
  itemName: string;
  storeCategory?: string;
  quantity: number;
}

export interface MerchantCategory {
  id: number;
  name: string;
  status?: string;
}

export interface PanelError {
  variant: "unauthorized" | "not_found";
  claimantName?: string;
  reason?: string;
}

export type StageId = 1 | 2 | 3 | 4 | 5;

/** Who the screen is waiting on. The one question dispatch work turns on. */
export type Turn = "you" | "customer" | "rider" | "done";

export type StageState = "done" | "active" | "todo";

export interface Stage {
  id: StageId;
  label: string;
  /** The line under the label: "2 stores pinned", "Maria hasn't replied yet". */
  statusLine: string;
  state: StageState;
  turn: Turn;
}

export type NowTone = "you" | "waiting" | "ready" | "problem" | "closed";

export interface NowAction {
  label: string;
  kind: "primary" | "secondary";
  /** What pressing it does. Resolved by the screen, not the model. */
  action: "accept" | "decline" | "nudge" | "changeList" | "sendRider" | "openStage";
  stage?: StageId;
}

export interface NowBarModel {
  tone: NowTone;
  /** One sentence. Always present. */
  sentence: string;
  /** Appended in a lighter weight — " · sent 4 min ago". */
  meta?: string;
  actions: NowAction[];
}

export interface StageModel {
  stages: Stage[];
  /** The stage that needs attention. What the accordion opens on. */
  activeStageId: StageId;
  now: NowBarModel;
  doneCount: number;
  /** True once every precondition for dispatch is met. */
  canSendRider: boolean;
  /** The first stage that isn't done — where a blocked CTA sends you. */
  firstUnfinishedId: StageId | null;
}
