import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import {
  LayoutGrid,
  UserCheck,
  TrendingUp,
  Settings,
  LogOut,
  AlertCircle,
  Users,
  UserCog,
  Shield,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  BarChart3,
  FileText,
  X,
} from "lucide-react";

/**
 * Sidebar — visually matches the ANPR reference project's Sidebar.tsx:
 * flush white panel with a right border (not a floating rounded card),
 * solid blue-600 active state, small icons, NavLink-driven active
 * detection, and the same collapsed/expanded group-children behavior.
 */
const Sidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed, logout, user } = useAppContext();
  const location = useLocation();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  // Tracked as state (not just a `md:hidden` CSS class) so the mobile close
  // button below doesn't exist in the DOM at all on desktop — several e2e
  // tests find "the modal's close button" via the first `button:has(svg
  // .lucide-x)` on the page, and a CSS-only hide would still leave this
  // button as that first match, breaking those clicks even though it's
  // invisible.
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.innerWidth < 1024,
  );
  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // RBAC — permissions come from the logged-in user's role (set at login,
  // see authService.setSession). A user with no permissions object at all
  // (e.g. a session predating RBAC) is treated as unrestricted rather than
  // silently locked out; once permissions are present, they're followed
  // exactly — a missing key means "not allowed".
  const permissions = user?.permissions;
  const isAllowed = (key) => (!permissions ? true : !!permissions[key]?.view);

  const menuItems = [
    { name: "Dashboard", icon: LayoutGrid, key: "dashboard", to: "/dashboard" },
    { name: "Master Data", icon: UserCheck, key: "vender", to: "/master-data" },
    {
      name: "Reports And Analysis",
      icon: TrendingUp,
      key: "reportsanalysis",
      children: [
        { name: "Reports", icon: FileText, to: "/reports" },
        { name: "Audit Logs", icon: ClipboardList, to: "/reports-analysis/audit-logs" },
        { name: "Analytics", icon: BarChart3, to: "/reports-analysis/analytics" },
      ],
    },
    {
      name: "User Management",
      icon: Users,
      key: "usermanagement",
      children: [
        { name: "User Master", icon: UserCog, to: "/user-management" },
        { name: "RBAC Master", icon: Shield, to: "/user-management/rbac-master" },
      ],
    },
    { name: "Settings", icon: Settings, key: "settings", to: "/settings" },
  ]
    .filter((item: any) => !item.hidden)
    .map((item) => ({ ...item, disabled: !isAllowed(item.key) }));

  // A group whose child route you're currently on should look expanded and
  // active from the moment you land on it — direct navigation, a page
  // refresh, or a link from elsewhere in the app all skip the click that
  // would otherwise have set this. Without this, landing on e.g. /reports
  // showed a sidebar with nothing expanded and nothing highlighted, which
  // reads as "the sidebar doesn't know where you are" rather than as a
  // collapsed group. Only adds the matching group — never removes one the
  // user opened by hand — so manual expand/collapse still works normally.
  useEffect(() => {
    const activeGroup = menuItems.find((item) =>
      item.children?.some((child) => location.pathname.startsWith(child.to)),
    );
    if (activeGroup) {
      setExpandedGroups((prev) => new Set(prev).add(activeGroup.key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isGroupActive = (item) =>
    !!item.children?.some((child) => location.pathname.startsWith(child.to));

  const toggleExpanded = (key) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Navigating should close the off-canvas drawer on mobile — otherwise it
  // stays open over the freshly-loaded page. Desktop's collapsed/expanded
  // state is a real preference, so this leaves that alone.
  const closeOnMobileNavigate = () => {
    if (window.innerWidth < 1024) setSidebarCollapsed(true);
  };

  return (
    <>
      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Logout confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Confirm Logout</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to log out of Xtracto? You will need to sign in again to access your data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={
          sidebarCollapsed
            ? "left-slidebar dark-shadow sidebar-none flex flex-col"
            : "left-slidebar dark-shadow sidebar-block flex flex-col"
        }
        style={{ width: sidebarCollapsed ? "72px" : "256px" }}
      >
        {/* Logo */}
        <div
          className={`flex h-20 items-center border-b border-slate-200 shrink-0 ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"
          }`}
        >
          <img
            src="/finallogo.png"
            alt="Logo"
            style={{
              height: sidebarCollapsed ? "36px" : "44px",
              width: "auto",
              objectFit: "contain",
              transition: "all 0.2s ease",
            }}
          />
          {/* Mobile-only close button — the hamburger in the Navbar sits
              underneath this open drawer (same left-edge z-index stack),
              so it's not reachable to close the drawer without this. Only
              mounted at all on mobile (see isMobileViewport above), not
              just CSS-hidden on desktop. */}
          {isMobileViewport && !sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = !!item.children;
            const isExpanded = expandedGroups.has(item.key);
            const isDisabled = item.disabled;
            const title = isDisabled ? `${item.name} (not permitted for your role)` : item.name;

            if (hasChildren) {
              const groupActive = isGroupActive(item);
              return (
                <div key={item.key}>
                  <button
                    type="button"
                    title={sidebarCollapsed ? title : undefined}
                    disabled={isDisabled}
                    onClick={() => !isDisabled && toggleExpanded(item.key)}
                    className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      sidebarCollapsed ? "justify-center" : "justify-between"
                    } ${
                      isDisabled
                        ? "text-slate-300 cursor-not-allowed"
                        : groupActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && item.name}
                    </span>
                    {!sidebarCollapsed &&
                      (isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      ))}
                  </button>

                  {/* Expanded sidebar: indented labels with a connecting rail
                      so the group reads as one visual unit, not a loose list
                      floating under the parent. */}
                  <div
                    className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out ${
                      hasChildren && isExpanded && !sidebarCollapsed && !isDisabled
                        ? "grid-rows-[1fr] mt-1"
                        : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="min-h-0">
                      {/* Rail sits under the parent icon's own center (px-3 +
                          half of a 16px icon ≈ 20px) so the vertical line
                          reads as "descending from that icon", not an
                          arbitrary offset. Row height/font/icon size match
                          the parent and top-level items exactly — the
                          previous smaller text-[13px]/h-3.5 on children next
                          to text-sm/h-4 on everything else read as an
                          unintentional mismatch rather than a deliberate
                          hierarchy. */}
                      <div className="ml-5 space-y-1 border-l border-slate-200 pl-3">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            end
                            onClick={closeOnMobileNavigate}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                isActive
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              }`
                            }
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Collapsed sidebar: icon-only, stacked under the parent icon */}
                  {hasChildren && isExpanded && sidebarCollapsed && !isDisabled && (
                    <div className="mt-1 flex flex-col items-center space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          title={child.name}
                          className={({ isActive }) =>
                            `flex items-center justify-center rounded-md p-2 transition-colors ${
                              isActive
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            }`
                          }
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={item.to}
                end
                title={sidebarCollapsed ? title : undefined}
                onClick={(e) => {
                  if (isDisabled) e.preventDefault();
                  else closeOnMobileNavigate();
                }}
                className={({ isActive }) =>
                  `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    sidebarCollapsed ? "justify-center" : "gap-3"
                  } ${
                    isDisabled
                      ? "text-slate-300 cursor-not-allowed"
                      : isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-200 px-3 py-3">
          <button
            type="button"
            title={sidebarCollapsed ? "Logout" : undefined}
            onClick={() => setShowLogoutModal(true)}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
