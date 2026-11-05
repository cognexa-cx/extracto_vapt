// Frontend\tab\src\pages\ReturnableListPage.jsx
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, CheckCircle2, PackageCheck } from "lucide-react";
import { getReturnableRecords, setReturnStatus } from "../services/returnableService";
import ConfirmDialog from "../components/ConfirmDialog";
import RecordDetailModal from "../components/RecordDetailModal";
import DatePickerModal from "../components/DatePickerModal";

// Best-effort field resolution — extracted_data shape varies a lot document
// to document (see backend/routes/history.py comments), so this checks a
// handful of common spellings rather than assuming one fixed schema. Mirrors
// the same "check several likely keys" approach Extracto-Web's
// invoiceService.js uses for its own record list.
const firstOf = (...candidates) =>
  candidates.find((v) => typeof v === "string" && v.trim().length > 0) || "-";

function resolveFields(record) {
  const ex = record.extracted_data || {};
  const transporter = ex.transporter_details || {};
  const issuer = ex.issuer_details || ex.issuer || ex.from_party || {};
  const meta = ex.document_metadata || {};

  return {
    documentNo: firstOf(
      ex.document_number,
      ex.challan_no,
      ex.security_gate_pass_no,
      meta.document_number,
      record.id?.slice(0, 8),
    ),
    vendor: firstOf(issuer.name, issuer.company_name, ex.vendor_name, ex.supplier_name),
    projectSite: firstOf(ex.project_site, meta.project_site, ex.material_belongs_to),
    vehicleNo: firstOf(
      transporter.vehicle_number,
      ex.truck_tempo_no,
      ex.vehicle_number,
    ),
    date: record.created_at,
  };
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const FILTER_INPUT =
  "h-10 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";

export default function ReturnableListPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | returned
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null); // record being marked returned
  const [updatingId, setUpdatingId] = useState(null);
  const [viewTarget, setViewTarget] = useState(null); // record open in the detail modal
  const [openPicker, setOpenPicker] = useState(null); // "from" | "to" | null

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReturnableRecords();
      setRecords(data);
    } catch (err) {
      setError(err.message || "Failed to load returnable items");
    } finally {
      setLoading(false);
    }
  };

  // Background refresh — doesn't touch `loading`/`error`, so it never
  // flashes the full-page spinner or clobbers an error banner over a
  // transient poll failure. A record approved from another session (e.g.
  // Web) wasn't showing up here until a manual Refresh click; this mirrors
  // Dashboard.tsx's polling pattern (20s interval + refetch on tab
  // focus/visibility) so the list stays current on its own too.
  const silentLoad = async () => {
    try {
      const data = await getReturnableRecords();
      setRecords(data);
    } catch {
      // Silent — the next successful poll (or a manual Refresh) recovers.
    }
  };

  useEffect(() => {
    load();

    const pollTimer = setInterval(silentLoad, 20 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") silentLoad();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const status = r.return_status || "active";
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (dateFrom || dateTo) {
        const created = r.created_at ? new Date(r.created_at) : null;
        if (!created) return false;
        if (dateFrom && created < new Date(dateFrom)) return false;
        if (dateTo && created > new Date(`${dateTo}T23:59:59`)) return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const { documentNo, vendor, projectSite, vehicleNo } = resolveFields(r);
        const haystack = `${documentNo} ${vendor} ${projectSite} ${vehicleNo}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [records, statusFilter, search, dateFrom, dateTo]);

  const handleMarkReturned = async () => {
    if (!confirmTarget) return;
    setUpdatingId(confirmTarget.id);
    try {
      const updated = await setReturnStatus(confirmTarget.id, "returned");
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      // Keep the detail modal open (if this is the record it's showing) but
      // refreshed with the new status, instead of yanking it closed on the
      // user mid-review.
      setViewTarget((prev) => (prev && prev.id === updated.id ? updated : prev));
      setConfirmTarget(null);
    } catch (err) {
      setError(err.message || "Failed to mark as returned");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6" style={{ paddingBottom: 40 }}>
      {/* Single unified toolbar: title, search/filters, and item count all
          live together in one section at the top. */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-slate-900">Returnable Items</h1>
              <p className="mt-1 text-xs text-slate-500">
                {filtered.length} of {records.length} shown
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, vendor, site, doc no..."
              className={`${FILTER_INPUT} w-full pl-10 pr-3`}
            />
          </div>

          <div className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {["all", "active", "returned"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`h-full rounded-md px-3 text-xs font-semibold capitalize transition ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex h-10 flex-nowrap items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500">From</span>
            <button
              type="button"
              onClick={() => setOpenPicker("from")}
              className={`${FILTER_INPUT} px-3 text-left ${dateFrom ? "text-slate-700" : "text-slate-400"}`}
            >
              {formatShortDate(dateFrom) || "Select date"}
            </button>
            <span className="text-xs font-semibold text-slate-500">To</span>
            <button
              type="button"
              onClick={() => setOpenPicker("to")}
              className={`${FILTER_INPUT} px-3 text-left ${dateTo ? "text-slate-700" : "text-slate-400"}`}
            >
              {formatShortDate(dateTo) || "Select date"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-32 rounded bg-slate-100 animate-pulse" />
                    <div className="h-4 w-14 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                  <div className="mt-2 h-3 w-48 rounded bg-slate-100 animate-pulse" />
                  <div className="mt-2 h-2.5 w-36 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-8 w-28 shrink-0 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <PackageCheck className="mb-3 h-8 w-8" />
            <p className="text-sm">No returnable items found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const { documentNo, vendor, projectSite, vehicleNo, date } = resolveFields(r);
              const status = r.return_status || "active";
              const isReturned = status === "returned";
              // Heading: vendor name, falling back to project site if vendor
              // wasn't extracted. Subtitle shows whichever of the two wasn't
              // already used as the heading, so they don't duplicate.
              const heading = vendor !== "-" ? vendor : projectSite;
              const subtitleSite = vendor !== "-" ? projectSite : null;
              return (
                <div
                  key={r.id}
                  onClick={() => setViewTarget(r)}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{heading}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isReturned
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {isReturned ? "Returned" : "Active"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {documentNo}
                      {subtitleSite && <> &bull; {subtitleSite}</>} &bull; {vehicleNo}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Out: {formatDate(date)}
                      {isReturned && r.returned_at && (
                        <> &bull; Returned: {formatDate(r.returned_at)}</>
                      )}
                    </p>
                  </div>

                  {!isReturned && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // don't also trigger the row's onClick (open detail view)
                        setConfirmTarget(r);
                      }}
                      disabled={updatingId === r.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Mark Returned
                    </button>
                  )}
                  {isReturned && (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewTarget && (
        <RecordDetailModal
          record={viewTarget}
          onClose={() => setViewTarget(null)}
          onMarkReturned={() => setConfirmTarget(viewTarget)}
          isMarking={updatingId === viewTarget.id}
        />
      )}

      {openPicker === "from" && (
        <DatePickerModal
          title="From date"
          value={dateFrom}
          onChange={setDateFrom}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker === "to" && (
        <DatePickerModal
          title="To date"
          value={dateTo}
          onChange={setDateTo}
          onClose={() => setOpenPicker(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Mark this item as returned?"
        message={confirmTarget ? resolveFields(confirmTarget).documentNo : ""}
        confirmLabel="Yes, Returned"
        cancelLabel="Cancel"
        isLoading={Boolean(updatingId)}
        onConfirm={handleMarkReturned}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
