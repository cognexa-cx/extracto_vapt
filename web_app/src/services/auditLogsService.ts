import api from "./api";

const BASE_URL = "/api/auditlogs";

const auditLogsService = {
  getMeta: async () => {
    const response = await api.get(`${BASE_URL}/meta`);
    return response.data.data;
  },

  getLogs: async ({ q, action, module, user, startDate, endDate }: any = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    if (module) params.set("module", module);
    if (user) params.set("user", user);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const response = await api.get(`${BASE_URL}?${params.toString()}`);
    return { data: response.data.data || [], count: response.data.count || 0 };
  },
};

export default auditLogsService;
