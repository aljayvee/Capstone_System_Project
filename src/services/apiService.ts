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
}

export interface ApiMerchantCategory {
  id: number;
  name: string;
  description: string;
  merchantCount: number;
  status: "Active" | "Inactive";
}

export interface ApiRateConfig {
  id: number;
  baseFee: number;
  perKmRate: number;
  serviceFeePercent: number;
  nightSurcharge: number;
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
  async getUsers(): Promise<ApiUser[]> {
    try {
      const response = await apiClient.get<ApiUser[]>("/users");
      return response.data;
    } catch (err) {
      console.warn("API unavailable or access denied", err);
      return [];
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
      const message = err.response?.data?.error || err.message || "Failed to update user";
      throw new Error(message);
    }
  },

  // Merchant Categories API
  async getMerchantCategories(): Promise<ApiMerchantCategory[]> {
    try {
      const response = await apiClient.get<ApiMerchantCategory[]>("/merchant-categories");
      return response.data;
    } catch (err) {
      console.warn("API unavailable", err);
      return [];
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

  async updateRateConfig(config: Partial<ApiRateConfig>): Promise<ApiRateConfig | null> {
    try {
      const response = await apiClient.put<ApiRateConfig>("/rate-config", config);
      return response.data;
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },
};
