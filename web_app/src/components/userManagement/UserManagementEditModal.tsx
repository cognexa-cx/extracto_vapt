import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, Loader2, AlertCircle } from "lucide-react";
import userService from "../../services/userService"; // Import user service for uniqueness checks

const UserManagementEditModal = ({ isOpen, onClose, employee, onSave }) => {
  const [formData, setFormData] = useState({
    Emp_Name: "",
    Username: "",
    Emp_Email: "",
    Phone_Number: "",
    Base_Location: "",
    Designation: "",
    Status: "Active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        Emp_Name: employee.Emp_Name || "",
        Username: employee.Username || "",
        Emp_Email: employee.Emp_Email || "",
        Phone_Number: employee.Phone_Number || "",
        Base_Location: employee.Base_Location || "",
        Designation: employee.Designation || "",
        Status: employee.Status || "Active",
      });
      setErrors({});
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [employee, isOpen]);

  // ✅ Validate Username - No special characters, alphanumeric only
  const validateUsername = (username) => {
    if (!username?.trim()) {
      return "Username is required";
    }

    // Only alphanumeric characters and underscores allowed
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }

    if (username.length < 3) {
      return "Username must be at least 3 characters";
    }

    if (username.length > 20) {
      return "Username must be less than 20 characters";
    }

    return null;
  };

  // ✅ Validate Email with detailed error messages
  const validateEmail = (email) => {
    if (!email?.trim()) {
      return "Email is required";
    }

    // Remove whitespace
    email = email.trim().toLowerCase();

    // Comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }

    // Check email length
    if (email.length > 100) {
      return "Please enter a valid email address";
    }

    // Check for consecutive dots
    if (email.includes("..")) {
      return "Please enter a valid email address";
    }

    // Split and validate parts
    const parts = email.split("@");
    if (parts.length !== 2) {
      return "Please enter a valid email address";
    }

    const [localPart, domain] = parts;

    // Validate local part
    if (!localPart || localPart.startsWith(".") || localPart.endsWith(".")) {
      return "Please enter a valid email address";
    }

    // Validate domain part
    if (
      !domain ||
      domain.startsWith(".") ||
      domain.endsWith(".") ||
      !domain.includes(".")
    ) {
      return "Please enter a valid email address";
    }

    // Check domain extension (must be 2-6 characters - covers .co to .museum)
    const domainParts = domain.split(".");
    const extension = domainParts[domainParts.length - 1];

    // TLD should be between 2-6 characters (.co, .com, .info, .museum)
    if (extension.length < 2 || extension.length > 6) {
      return "Please enter a valid email address";
    }

    // Check if extension contains only letters
    if (!/^[a-zA-Z]+$/.test(extension)) {
      return "Please enter a valid email address";
    }

    return null;
  };

  // ✅ Validate Phone Number
  const validatePhoneNumber = (phone) => {
    if (!phone?.trim()) {
      return "Phone number is required";
    }

    // Remove spaces and hyphens
    const cleanPhone = phone.replace(/[\s-]/g, "");

    // Check if it's exactly 10 digits
    if (!/^\d{10}$/.test(cleanPhone)) {
      return "Phone number must be exactly 10 digits";
    }

    // Check if it starts with valid Indian mobile prefix (6-9)
    if (!/^[6-9]/.test(cleanPhone)) {
      return "Phone number must start with 6, 7, 8, or 9";
    }

    return null;
  };

  // ✅ Check uniqueness in database
  const checkUniqueness = async (field, value) => {
    if (!value) return;

    // Skip check if value hasn't changed
    if (employee && employee[field] === value) {
      return;
    }

    setValidating((prev) => ({ ...prev, [field]: true }));

    try {
      // Call your backend API to check uniqueness
      const response = await userService.checkFieldUniqueness(field, value);

      if (!response.isUnique) {
        setErrors((prev) => ({
          ...prev,
          [field]: `This ${field === "Username" ? "username" : field === "Emp_Email" ? "email" : "phone number"} is already in use`,
        }));
      } else {
        // Clear error if unique
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      console.error(`Error checking ${field} uniqueness:`, error);
    } finally {
      setValidating((prev) => ({ ...prev, [field]: false }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Employee Name
    if (!formData.Emp_Name?.trim()) {
      newErrors.Emp_Name = "Full name is required";
    } else if (formData.Emp_Name.length < 2) {
      newErrors.Emp_Name = "Name must be at least 2 characters";
    }

    // Username validation
    const usernameError = validateUsername(formData.Username);
    if (usernameError) {
      newErrors.Username = usernameError;
    }

    // Email validation
    const emailError = validateEmail(formData.Emp_Email);
    if (emailError) {
      newErrors.Emp_Email = emailError;
    }

    // Phone validation
    const phoneError = validatePhoneNumber(formData.Phone_Number);
    if (phoneError) {
      newErrors.Phone_Number = phoneError;
    }

    // Location
    if (!formData.Base_Location?.trim()) {
      newErrors.Base_Location = "Location is required";
    }

    // Designation
    if (!formData.Designation?.trim()) {
      newErrors.Designation = "Designation is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for Username - prevent special characters in real-time
    if (name === "Username") {
      const sanitized = value.replace(/[^a-zA-Z0-9_]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: sanitized,
      }));

      // Real-time validation for username
      const usernameError = validateUsername(sanitized);
      if (usernameError) {
        setErrors((prev) => ({ ...prev, Username: usernameError }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.Username;
          return newErrors;
        });
      }
    } else if (name === "Phone_Number") {
      // Only allow digits and remove other characters
      const sanitized = value.replace(/[^\d]/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: sanitized,
      }));

      // Real-time validation for phone
      const phoneError = validatePhoneNumber(sanitized);
      if (phoneError) {
        setErrors((prev) => ({ ...prev, Phone_Number: phoneError }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.Phone_Number;
          return newErrors;
        });
      }
    } else if (name === "Emp_Email") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Real-time validation for email
      const emailError = validateEmail(value);
      if (emailError) {
        setErrors((prev) => ({ ...prev, Emp_Email: emailError }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.Emp_Email;
          return newErrors;
        });
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error for this field
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // ✅ Blur handlers for uniqueness checks
  const handleUsernameBlur = () => {
    const error = validateUsername(formData.Username);
    if (!error) {
      checkUniqueness("Username", formData.Username);
    } else {
      setErrors((prev) => ({ ...prev, Username: error }));
    }
  };

  const handleEmailBlur = () => {
    const error = validateEmail(formData.Emp_Email);
    if (!error) {
      checkUniqueness("Emp_Email", formData.Emp_Email);
    } else {
      setErrors((prev) => ({ ...prev, Emp_Email: error }));
    }
  };

  const handlePhoneBlur = () => {
    const error = validatePhoneNumber(formData.Phone_Number);
    if (!error) {
      checkUniqueness("Phone_Number", formData.Phone_Number);
    } else {
      setErrors((prev) => ({ ...prev, Phone_Number: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if still validating
    if (Object.values(validating).some((v) => v)) {
      return;
    }

    // Check if there are any errors (from uniqueness checks)
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await onSave(employee.Emp_Id, formData);
      onClose();
    } catch (error) {
      console.error("Error saving employee:", error);
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isFormValid =
    Object.keys(errors).length === 0 &&
    !Object.values(validating).some((v) => v);

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
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-600 border-b border-indigo-700">
          <div>
            <h2 className="text-lg font-bold text-white">Edit User</h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              Update user information • {employee?.Emp_Id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 bg-gray-50"
        >
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User ID (Read-only) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  User ID
                </label>
                <input
                  type="text"
                  value={employee?.Emp_Id || ""}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Full Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="Emp_Name"
                  value={formData.Emp_Name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors.Emp_Name
                      ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                      : "bg-white border-slate-300 focus:ring-indigo-500/20"
                  }`}
                  placeholder="Enter employee name"
                />
                {errors.Emp_Name && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.Emp_Name}
                  </p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="Username"
                    value={formData.Username}
                    onChange={handleChange}
                    onBlur={handleUsernameBlur}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      errors.Username
                        ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                        : "bg-white border-slate-300 focus:ring-indigo-500/20"
                    }`}
                    placeholder="john_doe123"
                  />
                  {validating.Username && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />
                  )}
                </div>
                {errors.Username && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.Username}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Only letters, numbers, and underscores allowed
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="Emp_Email"
                    value={formData.Emp_Email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      errors.Emp_Email
                        ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                        : "bg-white border-slate-300 focus:ring-indigo-500/20"
                    }`}
                    placeholder="employee@example.com"
                  />
                  {validating.Emp_Email && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />
                  )}
                </div>
                {errors.Emp_Email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.Emp_Email}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="Phone_Number"
                    value={formData.Phone_Number}
                    onChange={handleChange}
                    onBlur={handlePhoneBlur}
                    maxLength={10}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      errors.Phone_Number
                        ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                        : "bg-white border-slate-300 focus:ring-indigo-500/20"
                    }`}
                    placeholder="9876543210"
                  />
                  {validating.Phone_Number && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />
                  )}
                </div>
                {errors.Phone_Number && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.Phone_Number}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  10-digit Indian mobile number
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Base Location <span className="text-red-500">*</span>
                </label>
                <select
                  name="Base_Location"
                  value={formData.Base_Location}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors.Base_Location
                      ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                      : "bg-white border-slate-300 focus:ring-indigo-500/20"
                  }`}
                >
                  <option value="">Select Location</option>
                  <option value="Chennai">Chennai</option>
                  {/* <option value="Pune">Pune</option> */}
                  {/* <option value="Mumbai">Mumbai</option> */}
                  {/* <option value="Bangalore">Bangalore</option> */}
                  {/* <option value="Delhi">Delhi</option> */}
                </select>
                {errors.Base_Location && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.Base_Location}
                  </p>
                )}
              </div>

              {/* Designation — locked once an account is Admin (matches the
                  backend's own guard: an Admin's designation can't be
                  changed by anyone, so it can't be demoted and then
                  deleted/deactivated through that back door). */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  name="Designation"
                  value={formData.Designation}
                  onChange={handleChange}
                  disabled={employee?.Designation === "Admin"}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                    errors.Designation
                      ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                      : "bg-white border-slate-300 focus:ring-indigo-500/20"
                  }`}
                >
                  <option value="">Select Designation</option>
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                  <option value="Security">Security</option>
                  <option value="Other">Other</option>
                </select>
                {employee?.Designation === "Admin" ? (
                  <p className="mt-1 text-xs text-slate-500">An Admin account's designation can't be changed.</p>
                ) : (
                  errors.Designation && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.Designation}
                    </p>
                  )
                )}
              </div>

              {/* Status — Admin accounts can't be deactivated, so this is
                  locked to Active whenever the account being edited is
                  currently an Admin (matches the backend's own guard). */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <select
                  name="Status"
                  value={formData.Status}
                  onChange={handleChange}
                  disabled={employee?.Designation === "Admin"}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {employee?.Designation === "Admin" && (
                  <p className="mt-1 text-xs text-slate-500">Admin accounts can't be deactivated.</p>
                )}
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.submit}
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !isFormValid}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default UserManagementEditModal;
