export type UserRole = "owner" | "dispatcher" | "rider" | "customer";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  position?: string;
  vehicleType?: string;
  plateNumber?: string;
  riderId?: string;
  address?: string;
  landmark?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}
