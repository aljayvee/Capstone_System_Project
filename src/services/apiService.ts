const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";


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

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("errand_system_jwt_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const apiService = {
  // Authentication API
  async login(username: string, password: string): Promise<{ user: any; token: string; message?: string } | { error: string }> {
    try {
      // Try /api/auth/login first, then /login fallback
      let res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL.replace(/\/api$/, "")}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Authentication failed. Invalid username or password." };
      }
      return data;
    } catch (err: any) {
      console.warn("Backend auth failed, error:", err);
      return { error: err.message || "Unable to connect to backend authentication server." };
    }
  },

  // Users API
  async getUsers(): Promise<ApiUser[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    } catch (err) {
      console.warn("API unavailable, fallback to local state", err);
      return [];
    }
  },

  async createUser(userData: Partial<ApiUser> & { password?: string }): Promise<ApiUser | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      return data;
    } catch (err: any) {
      console.warn("API Error (createUser):", err);
      throw err;
    }
  },

  async updateUser(id: number, userData: Record<string, any>): Promise<ApiUser | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }
      return data;
    } catch (err: any) {
      console.warn("API Error (updateUser):", err);
      throw err;
    }
  },


  // Merchant Categories API
  async getMerchantCategories(): Promise<ApiMerchantCategory[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/merchant-categories`, {
        headers: getAuthHeaders(),
      });
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
        headers: getAuthHeaders(),
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
      const res = await fetch(`${API_BASE_URL}/rate-config`, {
        headers: getAuthHeaders(),
      });
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
        headers: getAuthHeaders(),
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

