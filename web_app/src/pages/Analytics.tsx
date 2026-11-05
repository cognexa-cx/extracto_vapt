import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart3,
  FileStack,
  CheckCircle2,
  Users,
  Building2,
  ShieldCheck,
  CalendarClock,
  ArrowLeftRight,
  RotateCcw,
  UserCog,
  Activity,
  Inbox,
  FileText,
  UserPlus,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../components/common/PageHeader";
import Loading from "../components/common/Loading";
import StatCard from "../components/analytics/StatCard";
import ChartCard from "../components/analytics/ChartCard";
import RecentListCard from "../components/analytics/RecentListCard";
import analyticsService from "../services/analyticsService";
import { buildVolumeTrend, buildVolumeTrendRange } from "../utils/analyticsTrend";
import { DATE_PRESETS, resolveDatePreset } from "../utils/dateRangePresets";
import timeAgo from "../utils/timeAgo";
import { springs } from "../utils/motionTheme";

const DIRECTION_COLORS = { Inward: "#2563eb", Outward: "#06b6d4", Returnable: "#f59e0b", Manual: "#8b5cf6" };
const APPROVAL_COLORS = { Approved: "#10b981", Rejected: "#f43f5e" };
const RETURN_COLORS = { Active: "#f59e0b", Returned: "#10b981" };
const ROLE_COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#f43f5e", "#10b981", "#94a3b8"];
const AUDIT_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#94a3b8", "#0ea5e9"];

const DIRECTION_BADGE = {
  Inward: "bg-blue-50 text-blue-700",
  Outward: "bg-cyan-50 text-cyan-700",
  Returnable: "bg-amber-50 text-amber-700",
};
const STATUS_TEXT_BADGE = {
  Approve: "bg-emerald-50 text-emerald-700",
  Reject: "bg-rose-50 text-rose-600",
};
const USER_STATUS_BADGE = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-slate-100 text-slate-600",
  Deactive: "bg-slate-100 text-slate-600",
};

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: 12,
  padding: "8px 12px",
};

const EmptyChart = ({ label }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
    <Inbox className="h-8 w-8" />
    <p className="text-xs font-medium text-slate-400">{label}</p>
  </div>
);

// Rich hover card for the main Volume Trend graph — full date + a
// per-type breakdown + total, instead of Recharts' default plain list.
const VolumeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 text-xs font-bold text-slate-700">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-6 border-t border-slate-100 pt-1.5 text-xs">
        <span className="font-semibold text-slate-500">Total</span>
        <span className="font-bold text-slate-900 tabular-nums">{total}</span>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [datePreset, setDatePreset] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getAnalytics({ startDate, endDate });
      if (myReq !== reqId.current) return; // a newer range was picked meanwhile
      setData(result);
    } catch (err) {
      if (myReq !== reqId.current) return;
      setError(err.response?.data?.detail?.message || err.message || "Failed to load analytics");
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = resolveDatePreset(preset);
    setStartDate(range?.startDate || "");
    setEndDate(range?.endDate || "");
  };

  const directionData = data
    ? Object.entries(data.directionCounts)
        .map(([name, value]: [string, any]) => ({ name, value }))
        .filter((d) => d.value > 0)
    : [];
  const approvalData = data ? data.approvalBreakdown.filter((d) => d.value > 0) : [];
  const returnableData = data ? data.returnableBreakdown.filter((d) => d.value > 0) : [];
  const roleData = data ? data.roleBreakdown.filter((d) => d.value > 0) : [];
  const auditData = data ? data.auditBreakdown.slice(0, 8) : [];
  const hasRecords = (data?.kpis.totalRecords || 0) > 0;
  const hasAudit = (data?.kpis.totalAuditEvents || 0) > 0;
  const hasReturnable = returnableData.length > 0;
  const hasRoles = roleData.length > 0;

  const volumeTrend = useMemo(() => {
    if (!data) return [];
    return startDate && endDate
      ? buildVolumeTrendRange(data.records, startDate, endDate)
      : buildVolumeTrend(data.records, 30);
  }, [data, startDate, endDate]);
  const hasVolume = volumeTrend.some((d) => d.Total > 0);
  const volumeSubtitle =
    startDate && endDate
      ? `Inward, outward, returnable & manual entries — ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
      : "Inward, outward, returnable & manual entries — last 30 days";

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-5" style={{ minHeight: "calc(100vh - 130px)" }}>
      <div className="shrink-0">
        <PageHeader icon={BarChart3} title="Analytics" subtitle="Live insights across the whole app">
          <div className="flex items-center gap-1.5">
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {datePreset === "custom" && (
              <>
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
              </>
            )}
          </div>
        </PageHeader>
      </div>

      {loading ? (
        <div className="flex-1 py-16">
          <Loading size="lg" fullScreen={false} />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={FileStack} label="Total Records" value={data.kpis.totalRecords} color="blue" delay={0} />
            <StatCard icon={CheckCircle2} label="Approval Rate" value={data.kpis.approvalRate} suffix="%" color="emerald" delay={40} />
            <StatCard icon={CalendarClock} label="Today's Records" value={data.kpis.todayRecords} color="cyan" delay={80} />
            <StatCard icon={Building2} label="Master Data Records" value={data.kpis.totalMasterRecords} color="purple" delay={120} />
            <StatCard icon={Users} label="Active Users" value={data.kpis.activeUsers} color="amber" delay={160} />
            <StatCard icon={ShieldCheck} label="Audit Events" value={data.kpis.totalAuditEvents} color="rose" delay={200} />
          </div>

          {/* Main graph — volume of every record type, over a selectable range */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...springs.gentle, delay: 0.04 }}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Activity size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-none">Volume Trend</h3>
                <p className="mt-1 text-[11px] text-gray-400">{volumeSubtitle}</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${startDate}-${endDate}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={springs.ui}
                style={{ height: 320 }}
              >
              {!hasVolume ? (
                <EmptyChart label="No records in this range yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradInward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradOutward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradReturnable" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradManual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      interval={volumeTrend.length > 30 ? Math.floor(volumeTrend.length / 10) : "preserveStartEnd"}
                      minTickGap={20}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                    <Tooltip content={<VolumeTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="Inward"
                      stackId="1"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#gradInward)"
                      animationDuration={900}
                    />
                    <Area
                      type="monotone"
                      dataKey="Outward"
                      stackId="1"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#gradOutward)"
                      animationDuration={900}
                      animationBegin={80}
                    />
                    <Area
                      type="monotone"
                      dataKey="Returnable"
                      stackId="1"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#gradReturnable)"
                      animationDuration={900}
                      animationBegin={160}
                    />
                    <Area
                      type="monotone"
                      dataKey="Manual"
                      stackId="1"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#gradManual)"
                      animationDuration={900}
                      animationBegin={240}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Row 1: direction / approval / returnable */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard icon={ArrowLeftRight} title="Record Direction" subtitle="Inward / Outward / Returnable / Manual" delay={80}>
              {directionData.length === 0 ? (
                <EmptyChart label="No records yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={directionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      animationDuration={900}
                      animationBegin={100}
                    >
                      {directionData.map((entry) => (
                        <Cell key={entry.name} fill={DIRECTION_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={CheckCircle2} title="Approval Status" subtitle="Approved vs rejected records" delay={120}>
              {!hasRecords || approvalData.length === 0 ? (
                <EmptyChart label="No records yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={approvalData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      animationDuration={900}
                      animationBegin={150}
                    >
                      {approvalData.map((entry) => (
                        <Cell key={entry.name} fill={APPROVAL_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={RotateCcw} title="Returnable Status" subtitle="Active vs returned items" delay={160}>
              {!hasReturnable ? (
                <EmptyChart label="No returnable records yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={returnableData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      animationDuration={900}
                      animationBegin={200}
                    >
                      {returnableData.map((entry) => (
                        <Cell key={entry.name} fill={RETURN_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Row 2: master data / roles / audit actions */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard icon={Building2} title="Master Data" subtitle="Active vs blocked, per master" delay={240}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.masterBreakdown} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="active" name="Active" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} animationDuration={900} />
                  <Bar dataKey="blocked" name="Blocked" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} animationDuration={900} animationBegin={100} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard icon={UserCog} title="Users by Role" subtitle="Designation breakdown" delay={280}>
              {!hasRoles ? (
                <EmptyChart label="No users yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      animationDuration={900}
                      animationBegin={100}
                    >
                      {roleData.map((entry, i) => (
                        <Cell key={entry.name} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={ShieldCheck} title="Audit Actions" subtitle="Most frequent logged actions" delay={320}>
              {!hasAudit ? (
                <EmptyChart label="No audit events yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" name="Events" radius={[0, 4, 4, 0]} animationDuration={900}>
                      {auditData.map((entry, i) => (
                        <Cell key={entry.name} fill={AUDIT_COLORS[i % AUDIT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Row 3: recent activity — latest documents & latest users */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentListCard
              icon={FileText}
              title="Recent Documents"
              subtitle="Latest inward, outward, returnable & manual entries"
              rows={data.recentRecords}
              emptyLabel="No records in this range yet"
              delay={360}
              renderRow={(r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      DIRECTION_BADGE[r.inward_outward] || "bg-purple-50 text-purple-700"
                    }`}
                  >
                    {r.entry_type === "manual" ? "Manual" : r.inward_outward}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">{r.vendor_name}</p>
                    <p className="truncate text-[11px] text-gray-400">{r.invoice_number}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      STATUS_TEXT_BADGE[r.approval_status] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.approval_status}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[11px] text-gray-400">{timeAgo(r.action_date)}</span>
                </div>
              )}
            />

            <RecentListCard
              icon={UserPlus}
              title="Recent Users"
              subtitle="Latest people added to the system"
              rows={data.recentUsers}
              emptyLabel="No users yet"
              delay={400}
              renderRow={(u) => (
                <div key={u.Emp_Id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600 ring-1 ring-blue-100">
                    {initials(u.Emp_Name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">{u.Emp_Name}</p>
                    <p className="truncate text-[11px] text-gray-400">{u.Designation || "—"}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      USER_STATUS_BADGE[u.Status] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.Status}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[11px] text-gray-400">{timeAgo(u.created_at)}</span>
                </div>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
