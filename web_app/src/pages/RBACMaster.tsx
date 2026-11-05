import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Shield, Save, Check } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import rbacService from "../services/rbacService";
import Loading from "../components/common/Loading";
import PageHeader from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ExportDropdown from "../components/common/ExportDropdown";
import { exportMultiSheetToExcel, getDateStamp } from "../utils/exportGenericUtils";

const ACTION_LABELS = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

const RBACMaster = () => {
  const { showNotification } = useAppContext();

  const [roles, setRoles] = useState([]);
  const [sections, setSections] = useState([]);
  const [actions, setActions] = useState([]);
  const [matrix, setMatrix] = useState({}); // working copy, being edited
  const [savedMatrix, setSavedMatrix] = useState({}); // last-saved/loaded snapshot
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rbacService.getMatrix();
      setRoles(data.roles || []);
      setSections(data.sections || []);
      setActions(data.actions || []);
      setMatrix(data.matrix || {});
      setSavedMatrix(JSON.parse(JSON.stringify(data.matrix || {})));
      setActiveRole((prev) => prev || (data.roles || [])[0]);
    } catch (err) {
      setError(err.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCell = (sectionKey, action) => {
    if (activeRole === "Admin") return;
    setJustSaved(false);
    setMatrix((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [sectionKey]: {
          ...prev[activeRole]?.[sectionKey],
          [action]: !prev[activeRole]?.[sectionKey]?.[action],
        },
      },
    }));
  };

  // Only enabled when the working copy actually differs from what's saved
  // — checking then unchecking a box lands back on the saved state, so
  // Save correctly goes disabled again rather than staying "dirty".
  const isDirty = useMemo(() => {
    if (!activeRole) return false;
    return JSON.stringify(matrix[activeRole]) !== JSON.stringify(savedMatrix[activeRole]);
  }, [matrix, savedMatrix, activeRole]);

  const handleSaveClick = () => {
    if (!activeRole || !isDirty) return;
    setConfirmSaveOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await rbacService.updateRolePermissions(activeRole, matrix[activeRole] || {});
      setSavedMatrix((prev) => ({
        ...prev,
        [activeRole]: JSON.parse(JSON.stringify(matrix[activeRole])),
      }));
      showNotification(`Permissions saved for ${activeRole}`, "success");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      showNotification(err.message || `Failed to save ${activeRole}`, "error");
    } finally {
      setSaving(false);
      setConfirmSaveOpen(false);
    }
  };

  const handleDiscard = () => {
    setMatrix((prev) => ({
      ...prev,
      [activeRole]: JSON.parse(JSON.stringify(savedMatrix[activeRole])),
    }));
  };

  // One workbook, one sheet per role — so the export shows every role's
  // permissions at once instead of only whichever tab happens to be open.
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const sheets = roles.map((role) => ({
        name: role.slice(0, 31),
        rows: sections.map((s) => {
          const record = { Section: s.label };
          actions.forEach((action) => {
            record[ACTION_LABELS[action] || action] = matrix[role]?.[s.key]?.[action] ? "Yes" : "No";
          });
          return record;
        }),
      }));
      await exportMultiSheetToExcel(sheets, `rbac_permissions_${getDateStamp()}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <Loading />;

  const isAdminRole = activeRole === "Admin";

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <PageHeader
        icon={Shield}
        title="RBAC Master"
        subtitle="Control which sections and actions each role can access"
      />

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Role tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => {
              setActiveRole(role);
              setJustSaved(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              activeRole === role
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {role}
          </button>
        ))}
        <div className="ml-auto">
          <ExportDropdown onExportExcel={handleExportExcel} isLoading={isExporting} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Section
                </th>
                {actions.map((action) => (
                  <th
                    key={action}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider"
                  >
                    {ACTION_LABELS[action] || action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sections.map((s) => (
                <tr key={s.key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                  </td>
                  {actions.map((action) => (
                    <td key={action} className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={!!matrix[activeRole]?.[s.key]?.[action]}
                        onChange={() => toggleCell(s.key, action)}
                        disabled={isAdminRole}
                        className="h-4 w-4 accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isAdminRole && (
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleDiscard}
              disabled={!isDirty || saving}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSaveClick}
              disabled={!isDirty || saving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                justSaved
                  ? "bg-emerald-600 text-white disabled:opacity-100"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
              }`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : justSaved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving…" : justSaved ? "Saved" : "Save"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmSaveOpen}
        title="Save permission changes?"
        message={`This updates what every ${activeRole} account can access, effective on their next request.`}
        onConfirm={handleSave}
        onCancel={() => setConfirmSaveOpen(false)}
        isLoading={saving}
        confirmLabel="Save"
        loadingLabel="Saving..."
        confirmColor="indigo"
      />
    </div>
  );
};

export default RBACMaster;
