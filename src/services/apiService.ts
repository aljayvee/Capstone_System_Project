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

// Sign-in does not always end in a session. When the account still has to prove
// it owns its email address (or, for the seeded bootstrap admin, still has to
// supply an identity at all), the server answers 200 with one of these instead
// of a token — see the server's loginChallengeService.
export interface LoginChallengeResponse {
  message?: string;
  otpRequired?: boolean;
  profileSetupRequired?: boolean;
  challengeToken: string;
  maskedEmail?: string | null;
  role: string;
  expiresInSeconds: number;
}

export interface LoginSuccessResponse {
  user: User;
  token: string;
  message?: string;
}

export type LoginResponse = LoginSuccessResponse | LoginChallengeResponse | { error: string };

export function isLoginChallenge(res: LoginResponse): res is LoginChallengeResponse {
  return "challengeToken" in res;
}

export interface CompleteLoginProfileInput {
  challengeToken: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
}

// Errors on the challenge endpoints carry a message worth showing verbatim
// (expired session, wrong code, cooldown), plus an optional retry hint the OTP
// screen uses to re-sync its countdown instead of trusting the client clock.
export interface ChallengeError {
  error: string;
  retryAfterSeconds?: number;
}

function toChallengeError(err: any, fallback: string): ChallengeError {
  return {
    error: err?.response?.data?.error || err?.message || fallback,
    retryAfterSeconds: err?.response?.data?.details?.retryAfterSeconds,
  };
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

// Metadata for the category's hero photo (`store_cat_image`). The list
// endpoint returns this shape and never the base64 payload, so a category grid
// stays a couple of kilobytes; `updatedAt` doubles as the cache-busting key for
// the separate image fetch.
export interface ApiStoreCategoryImageMeta {
  mimeType: string;
  fileSize: number;
  updatedAt: string;
}

export interface ApiStoreCategoryImage extends ApiStoreCategoryImageMeta {
  categoryId: number;
  imageData: string;
  fileName: string | null;
}

// How the purchase handling fee is charged for stops of this kind. The AMOUNTS
// live in RateConfig — only the mode is per-category, so the flat figure and the
// percentage stay editable in one place.
export type HandlingFeeMode = "THRESHOLD" | "FLAT" | "PERCENT" | "NONE";

export interface ApiMerchantCategory {
  id: number;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  handlingFeeMode?: HandlingFeeMode;
  /** How close the rider must get for a stop of this kind to count as reached. */
  geofenceRadiusMeters?: number;
  _count?: {
    places: number;
  };
  image?: ApiStoreCategoryImageMeta | null;
  createdAt?: string;
  updatedAt?: string;
}

// A verified place (location store) as returned by /places. Mirrors the shape
// PlacesDirectoryScreen already declares; re-stated here so the Store
// Categories module can list a category's stores without importing a screen.
export interface ApiVerifiedPlace {
  id: string;
  name: string;
  categoryId: number;
  address: string;
  barangay: string | null;
  latitude: number;
  longitude: number;
  keywords: string | null;
  isActive: boolean;
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
  /**
   * The parts of the pricing formula the owner cannot edit, published by the
   * server so the rate simulator reads them instead of holding its own copy.
   * Optional because an older server will not send it.
   */
  pricingRules?: {
    /** Kilometres the base fare covers before the per-km rate applies. */
    baseFeeDistanceKm: number;
    /** Item units above which a handling fee applies regardless of value. */
    handlingItemUnitsThreshold: number;
    /** Basket value at or above which a handling fee applies regardless of size. */
    handlingAmountThreshold: number;
  };
}

export type ExceptionKind =
  | "CASH_VARIANCE"
  | "RECEIPT_DIVERGENCE"
  | "UNVERIFIED_PURCHASE"
  | "WRONG_BRANCH"
  | "MISSING_RECEIPT"
  | "STALLED_STOP";

export interface ApiErrandException {
  errandId: string;
  kind: ExceptionKind;
  amountAtRisk: number;
  detail: string;
  riderId: number | null;
  riderName: string | null;
  occurredAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionReason: string | null;
}

/** Proof metadata — never the blob. Fetch one image by id to see the bytes. */
export interface ApiProofImage {
  id: number;
  kind: "RECEIPT" | "NO_RECEIPT" | "PROOF_OF_DELIVERY" | string;
  pinpointId: number | null;
  mimeType: string;
  byteSize: number;
  clarityVerdict: string | null;
  capturedAt: string;
  verified: boolean;
  declaredTotal: number | null;
  extraction: {
    extractedTotal: number | null;
    confirmedTotal: number | null;
    status: string;
    engine: string | null;
  } | null;
}

export interface ApiExceptionReport {
  meta?: { period: ReportPeriod; rangeLabel: string; start: string; end: string };
  exceptions: ApiErrandException[];
  summary: {
    openCount: number;
    resolvedCount: number;
    totalAtRisk: number;
    byKind: Array<{ kind: ExceptionKind; count: number; atRisk: number }>;
  };
  riders: Array<{
    riderId: number;
    riderName: string | null;
    errandCount: number;
    exceptionCount: number;
    rate: number;
    atRisk: number;
  }>;
  materialityPesos: number;
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
  // `identifier` is a username OR an email address — the server decides which by
  // looking for "@". The wire key stays `username` because the rider mobile app
  // is a separate deploy that still posts that field.
  async login(identifier: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post("/auth/login", { username: identifier, password });
      const data = response.data;
      // A challenge response carries no token, so this is correctly skipped and
      // no session is established until the challenge is completed.
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

  // Bootstrap admin only: supplies a real identity, then receives a fresh
  // challenge at the OTP step (the token is re-minted because the email it is
  // bound to just changed).
  async completeLoginProfile(
    input: CompleteLoginProfileInput
  ): Promise<LoginChallengeResponse | ChallengeError> {
    try {
      const response = await apiClient.post<LoginChallengeResponse>("/auth/complete-profile", input);
      return response.data;
    } catch (err: any) {
      return toChallengeError(err, "Could not save your details. Please try again.");
    }
  },

  async verifyLoginOtp(
    challengeToken: string,
    code: string
  ): Promise<LoginSuccessResponse | ChallengeError> {
    try {
      const response = await apiClient.post("/auth/verify-login-otp", { challengeToken, code });
      const data = response.data;
      // Mirrors login(): this is the point the session actually begins.
      if (data.token) {
        setMemoryAccessToken(data.token);
      }
      return data;
    } catch (err: any) {
      return toChallengeError(err, "Could not verify that code. Please try again.");
    }
  },

  async resendLoginOtp(challengeToken: string): Promise<LoginChallengeResponse | ChallengeError> {
    try {
      const response = await apiClient.post<LoginChallengeResponse>("/auth/resend-login-otp", {
        challengeToken,
      });
      return response.data;
    } catch (err: any) {
      return toChallengeError(err, "Could not send a new code. Please try again.");
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
      // Rethrown, not swallowed. The server rejects bills-payment category names
      // with a message naming the exact term it matched — swallowing that and
      // returning null left the owner with a generic "may already exist", which
      // is both wrong and unactionable. Both call sites handle the throw.
      throw err;
    }
  },

  async updateMerchantCategory(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      status: "Active" | "Inactive";
      handlingFeeMode: HandlingFeeMode;
      geofenceRadiusMeters: number;
    }>
  ): Promise<ApiMerchantCategory | null> {
    try {
      const response = await apiClient.put<ApiMerchantCategory>(`/merchant-categories/${id}`, data);
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      // Rethrown, not swallowed. The server rejects bills-payment category names
      // with a message naming the exact term it matched — swallowing that and
      // returning null left the owner with a generic "may already exist", which
      // is both wrong and unactionable. Both call sites handle the throw.
      throw err;
      return null;
    }
  },

  // The location stores filed under one category. includeInactive is passed so
  // the owner sees retired pins too - this list is the entry point to the
  // /places directory where a pin is brought back, and a store that is hidden
  // here is a store the owner cannot find.
  async getPlacesByCategory(categoryId: number): Promise<ApiVerifiedPlace[] | null> {
    try {
      const response = await apiClient.get<ApiVerifiedPlace[]>(
        `/places?categoryId=${categoryId}&includeInactive=true`
      );
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },

  // Store Category Image API (`store_cat_image`)
  // 404 is the documented "no photo set" answer, not a failure - it resolves to
  // null so callers can render the placeholder without a try/catch of their own.
  async getMerchantCategoryImage(id: number): Promise<ApiStoreCategoryImage | null> {
    try {
      const response = await apiClient.get<ApiStoreCategoryImage>(`/merchant-categories/${id}/image`);
      return response.data;
    } catch (err) {
      return null;
    }
  },

  // Throws on failure, unlike the null-returning readers above: an upload is a
  // deliberate user action and the form must be able to show why it failed.
  async uploadMerchantCategoryImage(
    id: number,
    data: { imageData: string; mimeType: string; fileSize: number; fileName?: string }
  ): Promise<ApiStoreCategoryImageMeta> {
    const response = await apiClient.put<ApiStoreCategoryImageMeta>(
      `/merchant-categories/${id}/image`,
      data
    );
    return response.data;
  },

  async deleteMerchantCategoryImage(id: number): Promise<void> {
    await apiClient.delete(`/merchant-categories/${id}/image`);
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
  getExceptionReport(period: ReportPeriod, date?: string) {
    return fetchReport<ApiExceptionReport>("/reports/exceptions", period, date);
  },

  /** The dispatcher's working queue — what is still open, right now. */
  async getOpenExceptions(days = 14): Promise<ApiExceptionReport | null> {
    try {
      const response = await apiClient.get<ApiExceptionReport>(`/errands/exceptions?days=${days}`);
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  /**
   * The photos behind one errand — metadata only, so a queue of ten rows does
   * not pull ten megabytes of base64 nobody has looked at yet.
   */
  async listProofImages(errandId: string): Promise<ApiProofImage[] | null> {
    try {
      const response = await apiClient.get<ApiProofImage[]>(`/errands/${errandId}/proof-images`);
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  /** One image's bytes, for a viewer that is about to display it. */
  async getProofImage(
    errandId: string,
    imageId: number
  ): Promise<{ id: number; mimeType: string; imageData: string } | null> {
    try {
      const response = await apiClient.get<{ id: number; mimeType: string; imageData: string }>(
        `/errands/${errandId}/proof-images/${imageId}`
      );
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  /** Records that a person considered an exception and what they concluded. */
  async resolveException(
    errandId: string,
    body: { kind: ExceptionKind; reason: string; amountAtRisk: number }
  ): Promise<boolean> {
    await apiClient.post(`/errands/${errandId}/exceptions/resolve`, body);
    return true;
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
