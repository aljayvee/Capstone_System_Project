import { Errand, ErrandStatus, isValidErrandTransition } from "../types/errand";
import { User } from "../types/auth";

export interface MockRider {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "On Errand" | "Offline";
  currentErrandId?: string;
  rating: number;
  completedToday: number;
  lat: number;
  lng: number;
}

export class ErrandService {
  private static errands: Errand[] = [];
  private static riders: MockRider[] = [];
  private static users: User[] = [];

  public static async getErrands(): Promise<Errand[]> {
    return [...this.errands];
  }

  public static async addErrand(newErrand: Omit<Errand, "id" | "createdAt" | "updatedAt">): Promise<Errand> {
    const errand: Errand = {
      ...newErrand,
      id: `ERR-${1000 + this.errands.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.errands.push(errand);
    return errand;
  }

  public static async updateErrandStatus(errandId: string, targetStatus: ErrandStatus): Promise<Errand> {
    const errand = this.errands.find((e) => e.id === errandId);
    if (!errand) {
      throw new Error(`Errand with ID ${errandId} not found.`);
    }

    if (!isValidErrandTransition(errand.status, targetStatus)) {
      throw new Error(`Illegal state transition from ${errand.status} to ${targetStatus}`);
    }

    errand.status = targetStatus;
    errand.updatedAt = new Date().toISOString();
    return { ...errand };
  }

  public static async getRiders(): Promise<MockRider[]> {
    return [...this.riders];
  }

  public static async getUsers(): Promise<User[]> {
    return [...this.users];
  }
}
