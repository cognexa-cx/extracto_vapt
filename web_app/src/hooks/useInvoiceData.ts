import { useState, useEffect, useCallback, useRef } from "react";
import invoiceService from "../services/invoiceService";

/**
 * Custom hook for fetching invoice data
 * @param {Object} options - { autoFetch, params }
 * @returns {Object}
 */
const useInvoiceData = (options: any = {}) => {
  const { autoFetch = true, params = {} } = options;

  const [stats, setStats] = useState<any>([]);
  const [records, setRecords] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Use ref to store latest params without causing re-renders
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Prevents overlapping fetchAllData calls from racing each other. This
  // replaced an earlier "latest requestId wins" approach: with React
  // StrictMode double-invoking the mount effect, two calls start almost
  // simultaneously, and whichever's `finally` block loses the requestId
  // comparison never clears `loading` — sometimes leaving BOTH calls stuck
  // (each started after the other, so neither is ever "latest" by the time
  // its own finally runs), permanently stuck on the loading spinner. Simplest
  // fix: don't let a second call start at all while one is already in flight.
  const isFetchingRef = useRef(false);

  /**
   * Fetch all data (stats + records)
   */
  const fetchAllData = useCallback(async (fetchParams?: any) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const actualParams = fetchParams || paramsRef.current;
      console.log("🔄 fetchAllData called with params:", actualParams);

      // Render each piece as soon as its own fetch resolves — /history/stats
      // returns in ~1s while the record list takes several seconds, so
      // awaiting both together made the stat cards wait on the slow call.
      const statsPromise = invoiceService.getDashboardStats().then((statsData) => {
        setStats(statsData);
        console.log("✅ Stats set:", statsData?.length);
      });
      const recordsPromise = invoiceService.getRecords(actualParams).then((recordsData) => {
        if (recordsData.data) {
          setRecords(recordsData.data);
          setPagination({
            page: recordsData.page || 1,
            totalPages: recordsData.totalPages || 1,
            total: recordsData.total || 0,
          });
          console.log("✅ Records set:", recordsData.data?.length);
        } else {
          setRecords(recordsData);
          console.log("✅ Records set (direct):", (recordsData as any)?.length);
        }
      });
      await Promise.all([statsPromise, recordsPromise]);

      console.log("✅ fetchAllData completed");
    } catch (err) {
      setError(err.message || "Failed to fetch data");
      console.error("❌ Error fetching data:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  /**
   * Fetch dashboard statistics
   */
  const fetchStats = useCallback(async (fetchParams?: any) => {
    try {
      setLoading(true);
      setError(null);
      const actualParams = fetchParams || paramsRef.current;
      console.log("📊 Fetching stats with params:", actualParams);
      const data = await invoiceService.getDashboardStats();
      setStats(data);
      console.log("✅ Stats fetched:", data?.length);
    } catch (err) {
      setError(err.message || "Failed to fetch statistics");
      console.error("❌ Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch invoice records
   */
  const fetchRecords = useCallback(async (fetchParams?: any) => {
    try {
      setLoading(true);
      setError(null);
      const actualParams = fetchParams || paramsRef.current;
      console.log("📋 Fetching records with params:", actualParams);
      const response = await invoiceService.getRecords(actualParams);

      if (response.data) {
        setRecords(response.data);
        setPagination({
          page: response.page || 1,
          totalPages: response.totalPages || 1,
          total: response.total || 0,
        });
        console.log("✅ Records fetched:", response.data?.length);
      } else {
        setRecords(response);
        console.log("✅ Records fetched (direct):", (response as any)?.length);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch records");
      console.error("❌ Error fetching records:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh data - stable callback that won't change
   */
  const refresh = useCallback(
    async (newParams) => {
      console.log("🔄 REFRESH called with:", newParams);
      console.log("🔄 Current params ref:", paramsRef.current);
      await fetchAllData(newParams);
      console.log("✅ REFRESH completed");
    },
    [fetchAllData],
  );

  // Silent background poll — no loading spinner
  const silentPoll = useCallback(async () => {
    try {
      const [statsData, recordsData] = await Promise.all([
        invoiceService.getDashboardStats(),
        invoiceService.getRecords(paramsRef.current),
      ]);
      setStats(statsData);
      if (recordsData.data) {
        setRecords(recordsData.data);
        setPagination({ page: recordsData.page || 1, totalPages: recordsData.totalPages || 1, total: recordsData.total || 0 });
      } else {
        setRecords(recordsData);
      }
    } catch {
      // silent — don't surface polling errors
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchAllData();
    }
  }, [autoFetch, fetchAllData]);



  return {
    // Data
    stats,
    records,
    pagination,

    // State
    loading,
    error,

    // Actions
    fetchStats,
    fetchRecords,
    fetchAllData,
    refresh,
    silentPoll,
    setRecords,
    setStats,
  };
};

export default useInvoiceData;
