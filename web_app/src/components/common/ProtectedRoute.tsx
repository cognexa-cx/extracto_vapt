// src/components/common/ProtectedRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import authService from "../../services/authService";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // SCR-02: an account flagged must_change_password is locked to the
  // change-password screen until it sets a new password.
  if (authService.requiresPasswordChange()) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};

export default ProtectedRoute;
