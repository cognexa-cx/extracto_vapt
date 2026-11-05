import React, { useState, useEffect } from "react";
import UserManagementStats from "../components/userManagement/UserManagementStats";
import UserManagementTable from "../components/userManagement/UserManagementTable";
import UserManagementEditModal from "../components/userManagement/UserManagementEditModal";
import UserManagementAddModal from "../components/userManagement/UserManagementAddModal";
import UserManagementViewModal from "../components/userManagement/UserManagementViewModal";
import ConfirmDeleteDialog from "../components/userManagement/ConfirmDeleteDialog";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Loading from "../components/common/Loading";
import PageHeader from "../components/common/PageHeader";
import useUserManagement from "../hooks/useUserManagement";
import { useAppContext } from "../context/AppContext";
import { Search, Users, UserPlus } from "lucide-react";
import { DATE_PRESETS, resolveDatePreset } from "../utils/dateRangePresets";

const UserManagement = () => {
  const { showNotification, user } = useAppContext();

  // RBAC — CRUD-level gating for this page's own actions (view-level access
  // to the page itself is already handled by Sidebar). No permissions
  // object at all (e.g. a session predating RBAC) is treated as
  // unrestricted, same fallback Sidebar uses.
  const umPerms = user?.permissions?.usermanagement;
  const canCreate = !umPerms || !!umPerms.create;
  const canEdit = !umPerms || !!umPerms.edit;
  const canDelete = !umPerms || !!umPerms.delete;

  const {
    employees,
    stats,
    loading,
    error,
    refresh,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
  } = useUserManagement({ autoFetch: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
  const [datePreset, setDatePreset] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = latest first
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const coloredStats =
    stats?.map((stat) => {
      const label = stat.label?.toUpperCase() || "";
      let color = "slate";
      let filterKey = null;

      if (label.includes("TOTAL")) {
        color = "slate";
        filterKey = "total";
      } else if (label.includes("INACTIVE")) {
        color = "rose";
        filterKey = "inactive";
      } else if (label.includes("ACTIVE")) {
        color = "emerald";
        filterKey = "active";
      } else if (label.includes("ADMIN")) {
        color = "amber";
        filterKey = "admin";
      } else if (label.includes("REGULAR") || label.includes("USER")) {
        color = "blue";
        filterKey = "user";
      } else if (label.includes("LOCATION")) {
        color = "cyan";
        filterKey = "location";
      }

      return {
        ...stat,
        color,
        filterKey,
        isActive: activeFilter !== null && activeFilter === filterKey,
        onClick: () => {
          if (filterKey === "total" || filterKey === "location") {
            setActiveFilter(null);
          } else if (filterKey) {
            setActiveFilter(activeFilter === filterKey ? null : filterKey);
          }
        },
      };
    }) || [];

  useEffect(() => {
    if (activeFilter) {
      setTimeout(() => {
        document.querySelector(".employee-table-section")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [activeFilter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("employee-search")?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setAddModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    await refresh();
    showNotification("User data refreshed", "success");
  };

  // UserManagementAddModal's own submit calls onAdd(employeeData) directly --
  // this just stages it and opens a confirm step on top of the still-open
  // modal, rather than creating the account right away.
  const [pendingAddData, setPendingAddData] = useState(null);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [confirmAddLoading, setConfirmAddLoading] = useState(false);

  const handleAddEmployee = async (employeeData) => {
    setPendingAddData(employeeData);
    setConfirmAddOpen(true);
  };

  const performAddEmployee = async () => {
    setConfirmAddLoading(true);
    const result = await createEmployee(pendingAddData);

    if (result.success) {
      showNotification("User added successfully", "success");
      setConfirmAddOpen(false);
      setAddModalOpen(false);
    } else {
      showNotification(result.message || "Failed to add employee", "error");
    }
    setConfirmAddLoading(false);
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setViewModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditModalOpen(true);
  };

  // Same staged-confirm pattern as Add — UserManagementEditModal's submit
  // calls onSave(empId, updatedData) directly.
  const [pendingEdit, setPendingEdit] = useState(null); // { empId, updatedData }
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmEditLoading, setConfirmEditLoading] = useState(false);

  const handleSaveEdit = async (empId, updatedData) => {
    setPendingEdit({ empId, updatedData });
    setConfirmEditOpen(true);
  };

  const performSaveEdit = async () => {
    if (!pendingEdit) return;
    setConfirmEditLoading(true);
    const result = await updateEmployee(pendingEdit.empId, pendingEdit.updatedData);

    if (result.success) {
      showNotification("User updated successfully", "success");
      setConfirmEditOpen(false);
      setEditModalOpen(false);
      setSelectedEmployee(null);
    } else {
      showNotification(result.message || "Failed to update employee", "error");
    }
    setConfirmEditLoading(false);
  };

  const handleDeleteEmployee = (employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;

    setDeleting(true);

    const result = await deleteEmployee(selectedEmployee.Emp_Id);

    if (result.success) {
      showNotification("User deleted successfully", "success");
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    } else {
      showNotification(result.message || "Failed to delete employee", "error");
    }

    setDeleting(false);
  };

  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null); // { empId, currentStatus, name }
  const [statusConfirmLoading, setStatusConfirmLoading] = useState(false);

  const handleToggleStatus = (empId, currentStatus) => {
    const emp = employees.find((e) => e.Emp_Id === empId);
    setStatusConfirmTarget({ empId, currentStatus, name: emp?.Emp_Name || empId });
  };

  const performToggleStatus = async () => {
    if (!statusConfirmTarget) return;
    const { empId, currentStatus } = statusConfirmTarget;
    setStatusConfirmLoading(true);
    const result = await toggleEmployeeStatus(empId, currentStatus);

    if (result.success) {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
      showNotification(`User ${newStatus.toLowerCase()}`, "success");
      setStatusConfirmTarget(null);
    } else {
      showNotification(result.message || "Failed to update status", "error");
    }
    setStatusConfirmLoading(false);
  };

  const searchTerm = searchQuery.trim().toLowerCase();
  const searchFilteredEmployees = searchTerm
    ? employees.filter((emp) =>
        [
          emp.Emp_Name, emp.Emp_Id, emp.Emp_Email, emp.Username,
          emp.Emp_Phone, emp.Phone_Number, emp.Designation, emp.Base_Location, emp.Status,
        ].some((v) => v != null && String(v).toLowerCase().includes(searchTerm)),
      )
    : employees;

  const statusFilteredEmployees = activeFilter
    ? searchFilteredEmployees.filter((emp) => {
        if (activeFilter === "active") return emp.Status === "Active";
        if (activeFilter === "inactive") return emp.Status === "Deactive";
        if (activeFilter === "admin")
          return emp.Designation?.toLowerCase() === "admin";
        if (activeFilter === "user")
          return emp.Designation?.toLowerCase() === "user";
        return true;
      })
    : searchFilteredEmployees;

  const dateFilteredEmployees =
    startDate || endDate
      ? statusFilteredEmployees.filter((emp) => {
          if (!emp.created_at) return false;
          // created_at is stored in UTC (often without a timezone marker);
          // compare the calendar day in India time, the day the user picked.
          const raw = String(emp.created_at);
          const parsed = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`);
          if (isNaN(parsed.getTime())) return false;
          const created = parsed.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
          if (startDate && created < startDate) return false;
          if (endDate && created > endDate) return false;
          return true;
        })
      : statusFilteredEmployees;

  const filteredEmployees = [...dateFilteredEmployees].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === "desc" ? -diff : diff;
  });

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = resolveDatePreset(preset);
    setStartDate(range?.startDate || "");
    setEndDate(range?.endDate || "");
  };

  if (loading && employees.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm mt-10">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h3 className="text-lg font-bold text-gray-900">System Error</h3>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-xs">
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="animate-in fade-in duration-500 flex flex-col gap-5 md:h-[calc(100vh-130px)]"
      >
        {/* Header */}
        <PageHeader icon={Users} title="User Management" subtitle="Manage employees and user accounts">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="employee-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className="pl-10 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full md:w-[260px] transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:block">
              <kbd className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block" />

          {canCreate && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </PageHeader>

        {/* Stats */}
        <div className="shrink-0">
          <UserManagementStats stats={coloredStats} loading={loading} />
        </div>

        {/* Table card — fills the rest of the page height; only the table
            body inside it scrolls, matching Master Data / Reports / Audit
            Logs (see UserManagementTable.jsx). */}
        <div className="employee-table-section bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
          {/* Date filter + sort — lives with the table, not the stats above it */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white py-1.5 px-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white py-1.5 px-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="desc">Latest First</option>
              <option value="asc">Oldest First</option>
            </select>
            {(datePreset || startDate || endDate) && (
              <button
                onClick={() => {
                  setDatePreset("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2"
              >
                Clear
              </button>
            )}
          </div>

          <UserManagementTable
            employees={filteredEmployees}
            onViewEmployee={handleViewEmployee}
            onEditEmployee={canEdit ? handleEditEmployee : undefined}
            onDeleteEmployee={canDelete ? handleDeleteEmployee : undefined}
            onToggleStatus={canEdit ? handleToggleStatus : undefined}
            activeFilter={activeFilter}
            onClearFilter={() => setActiveFilter(null)}
          />
        </div>

        {activeFilter && (
          <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-slate-700">
              Showing{" "}
              <span className="font-bold text-blue-600">
                {filteredEmployees.length}
              </span>{" "}
              of <span className="font-bold">{employees.length}</span> total
              employees
            </p>
          </div>
        )}
      </div>

      <UserManagementViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />

      <UserManagementEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onSave={handleSaveEdit}
      />

      <UserManagementAddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddEmployee}
      />

      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedEmployee(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this employee? This will permanently remove their account and all associated data."
        employeeName={`${selectedEmployee?.Emp_Name} (${selectedEmployee?.Emp_Id})`}
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmAddOpen}
        title="Add this user?"
        message="Creates a new account with the details you entered."
        onConfirm={performAddEmployee}
        onCancel={() => setConfirmAddOpen(false)}
        isLoading={confirmAddLoading}
        confirmLabel="Add"
        loadingLabel="Adding..."
        confirmColor="indigo"
      />

      <ConfirmDialog
        isOpen={confirmEditOpen}
        title="Save changes to this user?"
        message="This updates the account immediately."
        onConfirm={performSaveEdit}
        onCancel={() => setConfirmEditOpen(false)}
        isLoading={confirmEditLoading}
        confirmLabel="Save"
        loadingLabel="Saving..."
        confirmColor="indigo"
      />

      <ConfirmDialog
        isOpen={!!statusConfirmTarget}
        title={statusConfirmTarget?.currentStatus === "Active" ? `Deactivate ${statusConfirmTarget?.name}?` : `Activate ${statusConfirmTarget?.name}?`}
        message={
          statusConfirmTarget?.currentStatus === "Active"
            ? "They will be immediately blocked from logging in."
            : "They will be able to log in again."
        }
        onConfirm={performToggleStatus}
        onCancel={() => setStatusConfirmTarget(null)}
        isLoading={statusConfirmLoading}
        confirmLabel={statusConfirmTarget?.currentStatus === "Active" ? "Deactivate" : "Activate"}
        loadingLabel="Updating..."
        confirmColor={statusConfirmTarget?.currentStatus === "Active" ? "red" : "emerald"}
      />
    </>
  );
};

export default UserManagement;
