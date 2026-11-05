import api from "./api";

const systemService = {
  getStatus: async () => {
    const response = await api.get("/api/system/status");
    return response.data.data;
  },

  setStorePhotos: async (storePhotos) => {
    const response = await api.put("/api/system/settings/store-photos", { store_photos: storePhotos });
    return response.data;
  },

  setStoragePath: async (path) => {
    try {
      const response = await api.put("/api/system/settings/storage-path", { path });
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.detail?.message || error.response?.data?.message || error.message || "Failed to update storage folder";
      throw new Error(message);
    }
  },
};

export default systemService;
