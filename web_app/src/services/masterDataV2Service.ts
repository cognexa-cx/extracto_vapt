import api from "./api";

const BASE_URL = "/api/masterdata";

/**
 * Generic Master Data service — one client for all four masters
 * (vendors/warehouses/transporters/materials), since the backend exposes
 * them all under the same CRUD shape at /api/masterdata/{entity}/*.
 */
const masterDataV2Service = {
  getAll: async (entity) => {
    const response = await api.get(`${BASE_URL}/${entity}`);
    return { data: response.data.data || [], count: response.data.count || 0 };
  },

  search: async (entity, { q, status, startDate, endDate }: any = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const response = await api.get(`${BASE_URL}/${entity}/search?${params.toString()}`);
    return { data: response.data.data || [], count: response.data.count || 0 };
  },

  create: async (entity, payload) => {
    const response = await api.post(`${BASE_URL}/${entity}`, payload);
    return response.data;
  },

  update: async (entity, id, payload) => {
    const response = await api.put(`${BASE_URL}/${entity}/${id}`, payload);
    return response.data;
  },

  remove: async (entity, id) => {
    const response = await api.delete(`${BASE_URL}/${entity}/${id}`);
    return response.data;
  },

  activate: async (entity, id) => {
    const response = await api.post(`${BASE_URL}/${entity}/${id}/activate`);
    return response.data;
  },

  deactivate: async (entity, id) => {
    const response = await api.post(`${BASE_URL}/${entity}/${id}/deactivate`);
    return response.data;
  },
};

export default masterDataV2Service;
