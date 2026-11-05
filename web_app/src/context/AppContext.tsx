import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { STORAGE_KEYS, DEFAULT_WAREHOUSE } from "../utils/constants";
import authService from "../services/authService";

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- User State (NO MOCKUSER FALLBACK) ---
  const [user, setUser] = useState(() => {
    const storedUser = authService.getUser();
    return storedUser || null; // Return null if no user, NOT mockUser
  });

  // --- Sidebar State (Responsive Default) ---
  // On mobile, this boolean means "is the off-canvas drawer open" — that's
  // a transient, per-visit thing, not a preference worth persisting, so a
  // mobile load always starts closed regardless of what's in localStorage
  // (otherwise a value saved while collapsing/expanding the *desktop*
  // icon-rail sidebar could leave the drawer stuck open over the page on
  // the next mobile visit). On desktop it does mean a real, worth-persisting
  // preference (icon rail vs. full sidebar), so the saved value applies there.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (window.innerWidth < 1024) return true;
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE);
    return saved !== null ? JSON.parse(saved) : false;
  });

  // --- Warehouse State ---
  const [selectedWarehouse, setSelectedWarehouse] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_WAREHOUSE);
    return saved || DEFAULT_WAREHOUSE;
  });

  // --- UI States ---
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // --- Route to Menu Syncing ---
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/invoice/")) setActiveMenu("upload");
    else if (path.includes("/dashboard")) setActiveMenu("dashboard");
    else if (path.includes("/upload")) setActiveMenu("upload");
    else if (path.includes("/master-data")) setActiveMenu("vender");
    else if (path.includes("/blocked-vendors")) setActiveMenu("blocked-vendors");
    else if (path.includes("/reports")) setActiveMenu("reports");
    else if (path.includes("/settings")) setActiveMenu("settings");
    else if (path.includes("/add-user")) setActiveMenu("adduser");
    else if (path.includes("/user-management")) setActiveMenu("usermanagement");
  }, [location.pathname]);

  // --- Persistence Listeners ---
  // Only persist on desktop — on mobile, sidebarCollapsed just tracks
  // whether the off-canvas drawer happens to be open right now, and saving
  // that would overwrite the real desktop icon-rail/full-sidebar preference
  // the next time this same browser is used at a desktop width.
  useEffect(() => {
    if (window.innerWidth < 1024) return;
    localStorage.setItem(
      STORAGE_KEYS.SIDEBAR_STATE,
      JSON.stringify(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  // --- Close the mobile drawer on breakpoint crossing (resize/rotate) ---
  // Only reacts when the viewport actually crosses the mobile/desktop
  // boundary (1024px), not on every resize pixel — so it doesn't fight a
  // user's manual collapse/expand toggle on desktop, but does prevent a
  // mobile drawer left open from turning into a permanently-expanded
  // desktop sidebar (or vice versa) after a resize or tablet rotation.
  useEffect(() => {
    let wasMobile = window.innerWidth < 1024;
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_WAREHOUSE, selectedWarehouse);
  }, [selectedWarehouse]);

  // --- Update storage when user changes ---
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    }
  }, [user]);

  // --- Actions ---
  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const showNotification = useCallback((message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const hideNotification = useCallback(() => setNotification(null), []);

  const navigateTo = (menuKey) => {
    setShowInvoiceDetail(false);
    setCurrentInvoiceId(null);

    const routeMap = {
      dashboard: "/dashboard",
      upload: "/upload",
      vender: "/master-data",
      reports: "/reports",
      settings: "/settings",
      adduser: "/add-user",
      usermanagement: "/user-management",
      "blocked-vendors": "/blocked-vendors",
      test: "/test",
    };

    const route = routeMap[menuKey] || `/${menuKey}`;

    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }

    navigate(route);
  };

  const navigateToInvoiceDetail = (invoiceId) => {
    setCurrentInvoiceId(invoiceId);
    setShowInvoiceDetail(true);
    navigate(`/invoice/${invoiceId}`);
  };

  const logout = () => {
    // Clear all authentication data
    authService.logout();
    localStorage.clear();
    sessionStorage.clear();

    // Reset user state
    setUser(null);

    // Force redirect to login
    window.location.href = "/login";
  };

  const updateUser = (userData) => {
    setUser(userData);
    authService.setUser(userData);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  };

  const value = {
    user,
    setUser,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    activeMenu,
    setActiveMenu,
    selectedWarehouse,
    setSelectedWarehouse,
    globalLoading,
    setGlobalLoading,
    notification,
    showNotification,
    hideNotification,
    currentInvoiceId,
    setCurrentInvoiceId,
    showInvoiceDetail,
    setShowInvoiceDetail,
    navigateTo,
    navigateToInvoiceDetail,
    logout,
    updateUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};

export default AppContext;
