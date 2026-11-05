import React, { useState, useEffect, useCallback } from "react";
import { Server, RefreshCw, ShieldCheck, Database, Camera, FolderOpen, Pencil, Save, X } from "lucide-react";
import systemService from "../../services/systemService";
import { useAppContext } from "../../context/AppContext";

const TABLE_LABELS = {
  extraction_records: "Extraction Records",
  manual_entry_records: "Manual Entries",
  users: "Users",
  vendors: "Vendors",
  warehouses: "Warehouses",
  transporters: "Transporters",
  materials: "Materials",
  audit_logs: "Audit Logs",
};

const Row = ({ icon: Icon, iconBg, iconColor, children, last = false }) => (
  <div className={`flex items-start gap-3 py-3.5 ${last ? "" : "border-b border-slate-100"}`}>
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
      <Icon size={16} />
    </div>
    <div className="min-w-0 flex-1 pt-0.5">{children}</div>
  </div>
);

/**
 * Live connection + database check, plus the "Store Photos" toggle — GET
 * /api/system/status runs a real SELECT 1 against SQL Server and a real
 * sys.master_files size query, so every number here reflects this exact
 * moment rather than a cached/static label.
 */
const SystemStatusCard = () => {
  const { user, showNotification } = useAppContext();
  const [status, setStatus] = useState("checking"); // checking | online | offline
  const [data, setData] = useState<any>(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [togglingPhotos, setTogglingPhotos] = useState(false);
  const [editingPath, setEditingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState("");
  const [savingPath, setSavingPath] = useState(false);

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      const result = await systemService.getStatus();
      setData(result);
      setStatus("online");
    } catch {
      setStatus("offline");
      setData(null);
    } finally {
      setCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const handleTogglePhotos = async () => {
    if (!data || togglingPhotos) return;
    const next = !data.store_photos;
    setTogglingPhotos(true);
    try {
      await systemService.setStorePhotos(next);
      setData((d) => ({ ...d, store_photos: next }));
      showNotification(next ? "Photo storage enabled" : "Photo storage disabled — new approvals won't save images", "success");
    } catch (err) {
      showNotification(err.message || "Failed to update setting", "error");
    } finally {
      setTogglingPhotos(false);
    }
  };

  const startEditingPath = () => {
    setPathDraft(data?.storage?.path || "");
    setEditingPath(true);
  };

  const cancelEditingPath = () => {
    setEditingPath(false);
    setPathDraft("");
  };

  const handleSavePath = async () => {
    const next = pathDraft.trim();
    if (!next || next === data?.storage?.path || savingPath) return;
    setSavingPath(true);
    try {
      await systemService.setStoragePath(next);
      showNotification("Image storage folder updated", "success");
      setEditingPath(false);
      await check();
    } catch (err) {
      showNotification(err.message || "Couldn't use that folder", "error");
    } finally {
      setSavingPath(false);
    }
  };

  const accessibleSections = Object.values(user?.permissions || {}).filter((p: any) => p?.view).length;
  const db = data?.database;
  const statusDotColor = status === "online" ? "bg-emerald-500" : status === "offline" ? "bg-rose-500" : "bg-amber-400 animate-pulse";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
            <Server size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-none">System Status</h3>
            <p className="mt-1 text-[11px] text-gray-400">Live backend &amp; database</p>
          </div>
        </div>
        <button
          onClick={check}
          disabled={status === "checking"}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          title="Re-check"
        >
          <RefreshCw className={`h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="divide-y-0">
        {/* Backend connection */}
        <Row icon={Server} iconBg="bg-slate-100" iconColor="text-slate-500">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
            <p className="text-xs font-semibold text-slate-700">
              {status === "online" ? "Cloud backend is reachable" : status === "offline" ? "Cloud backend unreachable" : "Checking…"}
            </p>
            {checkedAt && <span className="ml-auto shrink-0 text-[10px] text-slate-400">{checkedAt.toLocaleTimeString()}</span>}
          </div>
        </Row>

        {/* Database */}
        <Row icon={Database} iconBg="bg-blue-50" iconColor="text-blue-600">
          {db ? (
            <>
              <p className="text-xs text-slate-600">
                <span className={`font-semibold ${db.connected ? "text-emerald-700" : "text-rose-600"}`}>
                  {db.connected ? "Connected" : "Unreachable"}
                </span>{" "}
                to <span className="font-semibold text-slate-800">{db.name}</span>
                {db.connected && db.latency_ms !== null && <span className="text-slate-400"> &middot; {db.latency_ms}ms</span>}
              </p>
              {db.connected && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Host: {db.host} {db.size_mb != null && <>&middot; Size: {db.size_mb.toLocaleString()} MB</>}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">Database status unavailable</p>
          )}
        </Row>

        {/* Store Photos toggle */}
        <Row icon={Camera} iconBg="bg-purple-50" iconColor="text-purple-600">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">Store Photos</p>
              <p className="text-[11px] text-slate-400">Save challan &amp; vehicle images on approve</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!data?.store_photos}
              onClick={handleTogglePhotos}
              disabled={!data || togglingPhotos}
              className={`relative mr-2 inline-flex h-7 w-[52px] shrink-0 items-center overflow-hidden rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                data?.store_photos ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  data?.store_photos ? "translate-x-[22px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </Row>

        {/* Where images actually land on disk */}
        <Row icon={FolderOpen} iconBg="bg-indigo-50" iconColor="text-indigo-600">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Image Storage Folder</p>
            {!editingPath && data?.storage && (
              <button
                onClick={startEditingPath}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Pencil className="h-3 w-3" />
                Change
              </button>
            )}
          </div>

          {editingPath ? (
            <div className="mt-1.5 space-y-2">
              <input
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                placeholder="e.g. C:\Extracto\Images"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-[11px] focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                The folder is created if it doesn't exist yet. New photo uploads switch over immediately.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditingPath}
                  disabled={savingPath}
                  className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePath}
                  disabled={!pathDraft.trim() || pathDraft.trim() === data?.storage?.path || savingPath}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-3 w-3" />
                  {savingPath ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : data?.storage ? (
            <>
              <p className="mt-0.5 break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">
                {data.storage.path}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {data.storage.exists ? (
                  <span className="text-emerald-600 font-medium">Folder exists</span>
                ) : (
                  <span className="text-rose-600 font-medium">Folder not found</span>
                )}
                {" · "}
                {data.storage.file_count} file{data.storage.file_count === 1 ? "" : "s"} &middot; {data.storage.total_mb} MB
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">Storage status unavailable</p>
          )}
        </Row>

        {/* Data overview */}
        {data?.tables && (
          <Row icon={Database} iconBg="bg-amber-50" iconColor="text-amber-600">
            <p className="mb-2 text-xs font-semibold text-slate-700">Data Overview</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(data.tables).map(([key, count]: [string, any]) => (
                <div key={key} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{TABLE_LABELS[key] || key}</span>
                  <span className="font-semibold text-slate-800 tabular-nums">{count ?? "—"}</span>
                </div>
              ))}
            </div>
          </Row>
        )}

        {/* Role / access */}
        <Row icon={ShieldCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" last>
          <p className="text-xs text-slate-600">
            Signed in as <span className="font-semibold text-slate-800">{user?.Designation}</span> with access to{" "}
            <span className="font-semibold text-slate-800">{accessibleSections}</span> section
            {accessibleSections === 1 ? "" : "s"}
          </p>
        </Row>
      </div>
    </div>
  );
};

export default SystemStatusCard;
