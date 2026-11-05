import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import authService from "../../services/authService";
import { Menu, Bell, Power, AlertCircle } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const {
    user,
    logout,
    sidebarCollapsed,
    setSidebarCollapsed,
    showNotification,
  } = useAppContext();

  const [showDropdown, setShowDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Handle Click Outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  useEffect(() => {
    const userData = user || authService.getUser();
    setCurrentUser(userData);
  }, [user]);

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    if (logout) logout();
    else authService.logout();
    if (showNotification) showNotification("Logged out successfully", "info");
    navigate("/login");
  };

  const sideMargin = 20;
  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  return (
    <div className="wrapper mb-5">
      {/* --- CUSTOM LOGOUT DIALOGUE --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-[90%] max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle
                  className="text-red-600 dark:text-red-400"
                  size={24}
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                Confirm Logout
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to log out of Xtracto? You will need to sign
              in again to access your data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border-0"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md border-0"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <nav
        className="navbar fixed-top d-flex header dark-shadow"
        style={{
          marginLeft: `${sidebarWidth + sideMargin}px`,
          marginRight: `${sideMargin}px`,
          width: `calc(100% - ${sidebarWidth + sideMargin * 2}px)`,
          top: "10px",
          borderRadius: "8px",
          transition: "all 0.3s ease-in-out",
          zIndex: 1000,
          position: "fixed",
          height: "70px",
        }}
      >
        <div className="navbar-menu-wrapper d-flex align-items-center justify-content-between w-100 px-3">
          <div className="d-flex align-items-center" style={{ gap: "15px" }}>
            {/* RESTORED OLD BUTTON STYLE */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="navbar-toggler p-0"
              type="button"
              style={{ border: "none", background: "none", cursor: "pointer" }}
            >
              <Menu size={24} className="text-gray-600" />
            </button>

            <div
              className="nav_swaraj_slogon"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="hidden xs:inline"
                style={{ fontSize: "20px", fontWeight: 800, color: "#4f46e5", letterSpacing: "0.12em" }}
              >
                DACCESS
              </span>
            </div>
          </div>

          <ul className="navbar-nav d-flex align-items-center flex-row list-unstyled mb-0">
            <li className="nav-item-bell mr-4">
              <Bell size={20} className="pointer-cursor text-gray-500" />
            </li>

            <li className="nav-item dropdown relative" ref={dropdownRef}>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                className="d-flex align-items-center pointer-cursor"
                style={{ cursor: "pointer" }}
              >
                <div className="profile-wrapper d-flex align-items-center">
                  {currentUser?.profilePic ? (
                    <img
                      src={currentUser.profilePic}
                      alt="profile"
                      className="profile-pic"
                    />
                  ) : (
                    <div className="profile-pic-default">
                      {(currentUser?.Emp_Name || currentUser?.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="profile-info ml-2 hidden md:block text-left">
                    <p
                      className="profile-name mb-0"
                      style={{ fontSize: "14px", fontWeight: "600" }}
                    >
                      {currentUser?.Emp_Name || currentUser?.name || "User"}
                    </p>
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      {currentUser?.Designation ||
                        currentUser?.role ||
                        "User"}
                    </small>
                  </div>
                </div>
              </div>

              {showDropdown && (
                <div
                  className="dropdown-menu show"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "55px",
                    minWidth: "260px",
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    padding: "0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {/* Email */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f0f0f0",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#9ca3af",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Email
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#374151",
                        wordBreak: "break-word",
                      }}
                    >
                      {currentUser?.Emp_Email ||
                        currentUser?.email ||
                        "user@example.com"}
                    </div>
                  </div>

                  {/* Sign Out */}
                  <div style={{ padding: "8px" }}>
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className="w-100 border-0 bg-transparent text-left d-flex align-items-center justify-content-between"
                      style={{
                        padding: "10px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "#dc2626",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fef2f2")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div className="d-flex align-items-center">
                        <Power size={16} style={{ marginRight: "8px" }} />
                        <span>Sign Out</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
