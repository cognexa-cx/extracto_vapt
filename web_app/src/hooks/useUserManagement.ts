import { useState, useEffect, useCallback } from "react";
import userManagementService from "../services/userManagementService";

const useUserManagement = ({ autoFetch = false }: any = {}) => {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateStats = useCallback((employeeData) => {
    if (!employeeData || employeeData.length === 0) {
      return [
        { label: "Total Users", value: 0, icon: "users" },
        { label: "Active Users", value: 0, icon: "user-check" },
        { label: "Inactive Users", value: 0, icon: "user-x" },
        { label: "Admin Users", value: 0, icon: "shield" },
        { label: "Regular Users", value: 0, icon: "user" },
        { label: "Locations", value: 0, icon: "map-pin" },
      ];
    }

    const total = employeeData.length;
    const active = employeeData.filter((e) => e.Status === "Active").length;
    const inactive = employeeData.filter((e) => e.Status === "Inactive").length;
    const admins = employeeData.filter((e) => e.Designation?.toLowerCase() === "admin").length;
    const users = employeeData.filter((e) => e.Designation?.toLowerCase() === "user").length;
    const locations = new Set(employeeData.map((e) => e.Base_Location).filter(Boolean)).size;

    return [
      { label: "Total Users", value: total, icon: "users" },
      { label: "Active Users", value: active, icon: "user-check" },
      { label: "Inactive Users", value: inactive, icon: "user-x" },
      { label: "Admin Users", value: admins, icon: "shield" },
      { label: "Regular Users", value: users, icon: "user" },
      { label: "Locations", value: locations, icon: "map-pin" },
    ];
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userManagementService.getAllEmployees();
      if (result.success) {
        setEmployees(result.data || []);
        setStats(calculateStats(result.data || []));
      } else {
        setError(result.message || "Failed to fetch employees");
      }
    } catch (err) {
      setError(err.message || "Network Error");
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  const createEmployee = useCallback(async (employeeData) => {
    try {
      const result = await userManagementService.createEmployee(employeeData);
      if (result.success) await fetchEmployees();
      return result;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [fetchEmployees]);

  const updateEmployee = useCallback(async (empId, employeeData) => {
    try {
      const result = await userManagementService.updateEmployee(empId, employeeData);
      if (result.success) await fetchEmployees();
      return result;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [fetchEmployees]);

  const deleteEmployee = useCallback(async (empId) => {
    try {
      const result = await userManagementService.deleteEmployee(empId);
      if (result.success) await fetchEmployees();
      return result;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [fetchEmployees]);

  const toggleEmployeeStatus = useCallback(async (empId, currentStatus) => {
    try {
      const result = await userManagementService.toggleEmployeeStatus(empId, currentStatus);
      if (result.success) await fetchEmployees();
      return result;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [fetchEmployees]);

  const refresh = useCallback(async () => {
    await fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (autoFetch) fetchEmployees();
  }, [autoFetch, fetchEmployees]);

  return {
    employees, stats, loading, error, refresh,
    fetchEmployees, createEmployee, updateEmployee,
    deleteEmployee, toggleEmployeeStatus,
  };
};

export default useUserManagement;
