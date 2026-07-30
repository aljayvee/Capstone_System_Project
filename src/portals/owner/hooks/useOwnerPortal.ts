import { useState, useEffect } from "react";
import { ErrandService, RateConfig } from "../../../services/errandService";

export function useOwnerPortal() {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "users" | "pricing" | "logs">("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [rateConfig, setRateConfig] = useState<RateConfig>({ baseFee: 50, perKmRate: 10, serviceFeePercent: 5 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedUsers = await ErrandService.getUsers();
        const fetchedRates = await ErrandService.getRateConfig();
        setUsers(fetchedUsers);
        setRateConfig(fetchedRates);
      } catch (err) {
        console.error("Failed to load owner portal data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateRates = async (newRates: RateConfig) => {
    const updated = await ErrandService.updateRateConfig(newRates);
    setRateConfig(updated);
  };

  return {
    activeTab,
    setActiveTab,
    users,
    rateConfig,
    isLoading,
    handleUpdateRates,
  };
}
