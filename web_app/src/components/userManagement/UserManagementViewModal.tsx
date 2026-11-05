import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Shield,
  UserCheck,
  UserX,
  Calendar,
  Hash,
  User,
} from "lucide-react";

const UserManagementViewModal = ({ isOpen, onClose, employee }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  const isActive = employee.Status === "Active";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800">
          <div>
            <h2 className="text-lg font-bold text-white">User Details</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              View-only information • {employee.Emp_Id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {employee.Emp_Name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {employee.Emp_Name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      @{employee.Username}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {isActive ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
                  {employee.Status}
                </div>
              </div>

              {/* User ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      User ID
                    </p>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {employee.Emp_Id}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Designation
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${
                      employee.Designation?.toLowerCase() === "admin"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {employee.Designation}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Contact Information
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Email Address
                    </p>
                    <p className="text-sm font-medium text-gray-900 break-all">
                      {employee.Emp_Email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.Phone_Number}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Location Details
              </h4>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Base Location
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {employee.Base_Location}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info (if available) */}
            {(employee.Created_At || employee.Updated_At) && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Record Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee.Created_At && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Created On
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(employee.Created_At).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  )}
                  {employee.Updated_At && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Last Updated
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(employee.Updated_At).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default UserManagementViewModal;
