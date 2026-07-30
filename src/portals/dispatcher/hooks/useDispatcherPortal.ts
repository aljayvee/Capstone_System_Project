import { useState, useEffect } from "react";
import { ErrandService, MockRider } from "../../../services/errandService";
import { Errand, ErrandStatus } from "../../../types/errand";

export function useDispatcherPortal() {
  const [activeTab, setActiveTab] = useState<"queue" | "riders" | "live_map">("queue");
  const [errands, setErrands] = useState<Errand[]>([]);
  const [riders, setRiders] = useState<MockRider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedErrands = await ErrandService.getErrands();
        const fetchedRiders = await ErrandService.getRiders();
        setErrands(fetchedErrands);
        setRiders(fetchedRiders);
      } catch (err) {
        console.error("Failed to load dispatcher portal data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateStatus = async (errandId: string, targetStatus: ErrandStatus) => {
    try {
      const updated = await ErrandService.updateErrandStatus(errandId, targetStatus);
      setErrands((prev) => prev.map((e) => (e.id === errandId ? updated : e)));
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  return {
    activeTab,
    setActiveTab,
    errands,
    riders,
    isLoading,
    handleUpdateStatus,
  };
}
