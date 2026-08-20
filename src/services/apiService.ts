import { apiClient, setMemoryAccessToken } from "./apiClient";
import { User } from "../types/auth";

export interface ApiUser {
  id: number;
  username: string;
  role: string;
  name: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  version: number;
}

export interface ConflictError extends Error {
  isConflict: true;
  latest: ApiUser | null;
}

function isConflictResponse(err: any): boolean {
  return err?.response?.status === 409;
}

export interface ApiRider {
  id: number;
  name: string;
  phone: string;
  avatar: string | null;
  status: "Active" | "Inactive";
  activeOrdersCount: number;
  online: boolean;
}

export interface ApiMerchantCategory {
  id: number;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  _count?: {
    places: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiRateConfig {
  id: number;
  baseFee: number;
  perKmRate: number;
  multiStoreFeePerStore: number;
  maxAdditionalStores: number;
  groceryFeeThreshold: number;
  groceryFeePercent: number;
  groceryFeeFlat: number;
  nonCodThreshold: number;
  nonCodFeeHigh: number;
  nonCodFeeLow: number;
}

export type DashboardFrequency = "TODAY" | "WEEK" | "MONTH" | "YEAR";

export interface ApiDashboardSummary {
  riders: { total: number; active: number; inactive: number };
  errands: { pending: number; active: number; completedAllTime: number; cancelled: number };
  revenue: { gross: number; estimatedCommission: number; estimatedRiderPayouts: number; orderCount: number };
  trend: Array<{ label: string; revenue: number }>;
}

export type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

interface ReportMeta {
  period: ReportPeriod;
  rangeLabel: string;
  start: string;
  end: string;
}

export interface ApiSalesReport extends ReportMeta {
  totalRevenue: number;
  totalOrders: number;
  byCategory: Array<{ category: string; revenue: number; count: number }>;
}

export interface ApiRiderPerformanceReport extends ReportMeta {
  riders: Array<{
    riderId: number;
    name: string;
    completedCount: number;
    avgDeliveryMinutes: number | null;
    averageRating: number | null;
  }>;
}

export interface ApiCommissionReport extends ReportMeta {
  estimatedCommission: number;
  totalDeliveryFees: number;
  orderCount: number;
  byCategory: Array<{ category: string; orderCount: number; revenue: number }>;
}

export interface ApiSettlementReport extends ReportMeta {
  grossRevenue: number;
  totalDeliveryFees: number;
  businessShare: number;
  riderShare: number;
  orderCount: number;
}

export interface ApiTransactionSummaryReport extends ReportMeta {
  transactions: Array<{
    transactionId: number;
    errandId: string;
    category: string;
    riderName: string | null;
    customerName: string | null;
    deliveryAddress: string;
    amount: number;
    deliveryFee: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>;
}

// Shared by the 5 report methods below — same query shape ({period, date}), same
// fetch-fails-soft behavior as every other method in this file.
async function fetchReport<T>(endpoint: string, period: ReportPeriod, date?: string): Promise<T | null> {
  try {
    const response = await apiClient.get<T>(endpoint, { params: { period, date } });
    return response.data;
  } catch (err) {
    console.warn(`API unavailable (${endpoint})`, err);
    return null;
  }
}

export const apiService = {
  // Authentication API
  async login(
    username: string,
    password: string
  ): Promise<{ user: User; token: string; message?: string } | { error: string }> {
    try {
      const response = await apiClient.post("/auth/login", { username, password });
      const data = response.data;
      if (data.token) {
        setMemoryAccessToken(data.token);
      }
      return data;
    } catch (err: any) {
      console.warn("Backend auth failed, error:", err);
      const errorMessage =
        err.response?.data?.error || err.message || "Unable to connect to backend authentication server.";
      return { error: errorMessage };
    }
  },

  // Users API
  // Returns null (not []) on failure — callers need to tell "API failed" apart
  // from "API succeeded with zero rows" so a real empty result isn't mistaken
  // for an error and masked by stale fallback data.
  async getUsers(): Promise<ApiUser[] | null> {
    try {
      const response = await apiClient.get<ApiUser[]>("/users");
      return response.data;
    } catch (err) {
      console.warn("API unavailable or access denied", err);
      return null;
    }
  },

  async createUser(userData: Partial<ApiUser> & { password?: string }): Promise<ApiUser | null> {
    try {
      const response = await apiClient.post<ApiUser>("/users", userData);
      return response.data;
    } catch (err: any) {
      console.warn("API Error (createUser):", err);
      const message = err.response?.data?.error || err.message || "Failed to create user";
      throw new Error(message);
    }
  },

  async updateUser(id: number, userData: Record<string, unknown>): Promise<ApiUser | null> {
    try {
      const response = await apiClient.put<ApiUser>(`/users/${id}`, userData);
      return response.data;
    } catch (err: any) {
      console.warn("API Error (updateUser):", err);
      if (isConflictResponse(err)) {
        const conflict = new Error(
          err.response?.data?.error || "This user was modified by someone else."
        ) as ConflictError;
        conflict.isConflict = true;
        conflict.latest = err.response?.data?.details?.latest ?? null;
        throw conflict;
      }
      const message = err.response?.data?.error || err.message || "Failed to update user";
      throw new Error(message);
    }
  },

  // Riders API
  // Same null-on-failure convention as getUsers() above.
  async getRiders(): Promise<ApiRider[] | null> {
    try {
      const response = await apiClient.get<{ success: boolean; riders: ApiRider[] }>("/riders");
      return response.data.riders;
    } catch (err) {
      console.warn("API unavailable or access denied", err);
      return null;
    }
  },

  // Merchant Categories API
  // Same null-on-failure convention as getUsers() above.
  // includeInactive: the endpoint returns only Active categories by default so
  // a retired store type can never reach the customer's picker. The owner's
  // management module is the one place that must still see and re-activate them.
  async getMerchantCategories(includeInactive = true): Promise<ApiMerchantCategory[] | null> {
    try {
      const response = await apiClient.get<ApiMerchantCategory[]>(
        `/merchant-categories${includeInactive ? "?includeInactive=true" : ""}`
      );
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  async createMerchantCategory(data: { name: string; description: string }): Promise<ApiMerchantCategory | null> {
    try {
      const response = await apiClient.post<ApiMerchantCategory>("/merchant-categories", data);
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },

  async updateMerchantCategory(
    id: number,
    data: Partial<{ name: string; description: string; status: "Active" | "Inactive" }>
  ): Promise<ApiMerchantCategory | null> {
    try {
      const response = await apiClient.put<ApiMerchantCategory>(`/merchant-categories/${id}`, data);
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },

  // Rate Config API
  async getRateConfig(): Promise<ApiRateConfig | null> {
    try {
      const response = await apiClient.get<ApiRateConfig>("/rate-config");
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  // Full object required, not partial — matches the backend, which always
  // upserts the complete RateConfig row (server/src/validators/rateConfigValidators.ts).
  async updateRateConfig(config: Omit<ApiRateConfig, "id">): Promise<ApiRateConfig | null> {
    try {
      const response = await apiClient.put<ApiRateConfig>("/rate-config", config);
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },

  // Analytics API
  async getDashboardSummary(frequency: DashboardFrequency): Promise<ApiDashboardSummary | null> {
    try {
      const response = await apiClient.get<ApiDashboardSummary>("/analytics/dashboard", { params: { frequency } });
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  // Reports API
  getSalesReport(period: ReportPeriod, date?: string) {
    return fetchReport<ApiSalesReport>("/reports/sales", period, date);
  },
  getRiderPerformanceReport(period: ReportPeriod, date?: string) {
    return fetchReport<ApiRiderPerformanceReport>("/reports/rider-performance", period, date);
  },
  getCommissionReport(period: ReportPeriod, date?: string) {
    return fetchReport<ApiCommissionReport>("/reports/commission", period, date);
  },
  getSettlementReport(period: ReportPeriod, date?: string) {
    return fetchReport<ApiSettlementReport>("/reports/settlement", period, date);
  },
  getTransactionSummary(period: ReportPeriod, date?: string) {
    return fetchReport<ApiTransactionSummaryReport>("/reports/transactions", period, date);
  },

  // Notifications API
  async getNotifications(): Promise<ApiNotification[] | null> {
    try {
      const response = await apiClient.get<ApiNotification[]>("/notifications");
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  async markNotificationRead(id: number): Promise<ApiNotification | null> {
    try {
      const response = await apiClient.patch<ApiNotification>(`/notifications/${id}/read`);
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },
};
