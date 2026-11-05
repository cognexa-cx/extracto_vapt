// Update your Layout.jsx
import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = () => {
  const { sidebarCollapsed } = useAppContext();

  useEffect(() => {
    document.body.classList.add("page-with-gradient");
    return () => document.body.classList.remove("page-with-gradient");
  }, []);

  const sideMargin = 20;
  const sidebarWidth = sidebarCollapsed ? 72 : 256;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div
        className="main-wrapper"
        style={{
          marginLeft: `${sidebarWidth + sideMargin}px`,
          transition: "margin-left 0.3s ease",
        }}
      >
        {/* Navbar Container with proper margins */}
        <div
          style={{
            paddingLeft: "0px",
            paddingRight: `${sideMargin}px`,
          }}
        >
          <Navbar />
        </div>

        <main className="main-content" style={{ paddingTop: "90px" }}>
          {/* No left padding here, deliberately — main-wrapper's left edge
              already lines up exactly with the Navbar's (both use the same
              sidebarWidth + sideMargin formula), so page content's left
              edge lines up with the Navbar's for free. Only right/bottom
              padding is needed for breathing room on those sides. */}
          <div
            className="content-wrapper"
            style={{
              padding: `0 ${sideMargin}px 20px 0`,
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
