import api from "./api";

const BASE_URL = "/api/usermanagement";

const rbacService = {
  /**
   * Fetch roles, sections, and the full role -> section permission matrix.
   * GET /api/usermanagement/rbac
   */
  getMatrix: async () => {
    const response = await api.get(`${BASE_URL}/rbac`);
    return response.data.data;
  },

  /**
   * Save one role's permissions (only the changed keys need to be sent).
   * PUT /api/usermanagement/rbac
   */
  updateRolePermissions: async (role, permissions) => {
    const response = await api.put(`${BASE_URL}/rbac`, { role, permissions });
    return response.data;
  },
};

export default rbacService;
