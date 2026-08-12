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

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}
