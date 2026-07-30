const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
  // Users API
  async getUsers(): Promise<ApiUser[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    } catch (err) {
      console.warn("API unavailable, fallback to local state", err);
      return [];
    }
  },

  async createUser(userData: Partial<ApiUser>): Promise<ApiUser | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error("Failed to create user");
      return await res.json();
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },

  // Merchant Categories API
  async getMerchantCategories(): Promise<ApiMerchantCategory[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/merchant-categories`);
      if (!res.ok) throw new Error("Failed to fetch merchant categories");
      return await res.json();
    } catch (err) {
      console.warn("API unavailable", err);
      return [];
    }
  },

  async createMerchantCategory(data: { name: string; description: string }): Promise<ApiMerchantCategory | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/merchant-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return await res.json();
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },

  // Rate Config API
  async getRateConfig(): Promise<ApiRateConfig | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/rate-config`);
      if (!res.ok) throw new Error("Failed to fetch rate config");
      return await res.json();
    } catch (err) {
      console.warn("API unavailable", err);
      return null;
    }
  },

  async updateRateConfig(config: Partial<ApiRateConfig>): Promise<ApiRateConfig | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/rate-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to update rate config");
      return await res.json();
    } catch (err) {
      console.warn("API Error:", err);
      return null;
    }
  },
};
