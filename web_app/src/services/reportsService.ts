import api from "./api";
import { mapRecord } from "./invoiceService";

/**
 * Reports — reads the same extraction_records / manual_entry_records data
 * the Dashboard uses, but through /history/all (no 500-row cap, real
 * backend-side direction/entry_type/date-range filtering) since a report
 * needs the full matching set for a chosen range, not just the latest page.
 */
const reportsService = {
  getRecords: async ({ direction, entryType, startDate, endDate, success }: any = {}) => {
    const params: Record<string, any> = {};
    if (direction) params.direction = direction;
    if (entryType) params.entry_type = entryType;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (success !== undefined && success !== "") params.success = success;

    const response = await api.get("/history/all", { params });
    const records = (response.data.records || []).map(mapRecord);
    return { data: records, count: records.length };
  },
};

export default reportsService;
