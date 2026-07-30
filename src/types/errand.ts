export type ErrandStatus =
  | "Pending"
  | "Assigned"
  | "Traveling"
  | "At Store"
  | "Purchased"
  | "En Route"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Disputed";

export interface Errand {
  id: string;
  customerName: string;
  customerPhone: string;
  category: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedCost: number;
  deliveryFee: number;
  tip: number;
  totalCost: number;
  status: ErrandStatus;
  riderId?: string;
  riderName?: string;
  createdAt: string;
  updatedAt: string;
}

// Strict legal state transitions matrix for anti-happy-path validation
const VALID_TRANSITIONS: Record<ErrandStatus, ErrandStatus[]> = {
  Pending: ["Assigned", "Cancelled"],
  Assigned: ["Traveling", "Cancelled"],
  Traveling: ["At Store", "Cancelled"],
  "At Store": ["Purchased", "Cancelled"],
  Purchased: ["En Route", "Cancelled"],
  "En Route": ["Delivered", "Cancelled"],
  Delivered: ["Completed", "Disputed"],
  Completed: [],
  Cancelled: [],
  Disputed: ["Completed", "Cancelled"],
};

export function isValidErrandTransition(current: ErrandStatus, target: ErrandStatus): boolean {
  if (current === target) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}
