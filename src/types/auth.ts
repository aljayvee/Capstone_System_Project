export type UserRole = "owner" | "dispatcher" | "rider" | "customer" | "OWNER" | "DISPATCHER" | "RIDER" | "CUSTOMER";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  token?: string;
  position?: string;
  vehicleType?: string;
  plateNumber?: string;
  riderId?: string;
  address?: string;
  landmark?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
  error?: string;
}

export interface ActiveSession {
  id: string;
  ipAddress: string;
  deviceInfo: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

export interface AccountLoginLog {
  id: number;
  userId: number;
  role: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string | null;
  status: string;
  sessionId: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface SupersededSessionInfo {
  ipAddress: string;
  deviceInfo: string;
  timestamp: string;
}

export interface AnotherDeviceActivePayload {
  anotherDeviceActive: true;
  existingSession: {
    ipAddress: string;
    deviceInfo: string;
    lastUsedAt: string;
    createdAt: string;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
  supersededInfo: SupersededSessionInfo | null;
  dismissSupersededNotice: () => void;
  isSessionExpired: boolean;
  dismissSessionExpiredNotice: () => void;
  notifySessionExpired: () => void;
}
