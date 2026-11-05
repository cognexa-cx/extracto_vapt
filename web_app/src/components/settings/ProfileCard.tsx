import React, { useState, useEffect, useRef } from "react";
import { User, Pencil, Save, X, Camera, Loader2 } from "lucide-react";
import userManagementService from "../../services/userManagementService";
import { useAppContext } from "../../context/AppContext";
import ConfirmDialog from "../common/ConfirmDialog";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const Field = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 truncate text-sm text-slate-800">{value || "—"}</p>
  </div>
);

/**
 * Profile — read-only summary by default; clicking "Update Profile" opens
 * inline editing for Name / Phone / Base Location (saved via the same PUT
 * /employee/{emp_id} route User Management uses). Username, Email,
 * Designation and Status stay read-only always — those are identity/
 * access-control fields, changed only from User Management. Plus a
 * working profile photo upload.
 */
const ProfileCard = () => {
  const { user, updateUser, showNotification } = useAppContext();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const [form, setForm] = useState({
    Emp_Name: user?.Emp_Name || "",
    Phone_Number: user?.Phone_Number || "",
    Base_Location: user?.Base_Location || "",
  });

  // Keep the form seeded from the real user object whenever it changes and
  // we're not mid-edit, so opening the editor always starts from the
  // current values.
  useEffect(() => {
    if (editing) return;
    setForm({
      Emp_Name: user?.Emp_Name || "",
      Phone_Number: user?.Phone_Number || "",
      Base_Location: user?.Base_Location || "",
    });
  }, [user?.Emp_Name, user?.Phone_Number, user?.Base_Location, editing]);

  const isDirty =
    form.Emp_Name !== (user?.Emp_Name || "") ||
    form.Phone_Number !== (user?.Phone_Number || "") ||
    form.Base_Location !== (user?.Base_Location || "");

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const startEditing = () => {
    setForm({
      Emp_Name: user?.Emp_Name || "",
      Phone_Number: user?.Phone_Number || "",
      Base_Location: user?.Base_Location || "",
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm({
      Emp_Name: user?.Emp_Name || "",
      Phone_Number: user?.Phone_Number || "",
      Base_Location: user?.Base_Location || "",
    });
    setEditing(false);
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    if (!isDirty || saving || !user) return;
    setConfirmSaveOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await userManagementService.updateEmployee(user.Emp_Id, form);
      updateUser({ ...user, ...result.data });
      showNotification("Profile updated successfully", "success");
      setEditing(false);
      setConfirmSaveOpen(false);
    } catch (err) {
      showNotification(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (!uploadingAvatar) fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      showNotification("Please choose an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification("Image must be under 5MB", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await userManagementService.uploadAvatar(user.Emp_Id, file);
      updateUser({ ...user, ...result.data });
      showNotification("Profile photo updated", "success");
    } catch (err) {
      showNotification(err.message || "Failed to upload photo", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-40 animate-pulse rounded-lg bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <User size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-none">My Profile</h3>
            <p className="mt-1 text-[11px] text-gray-400">Your account details</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            Update Profile
          </button>
        )}
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-lg bg-slate-50 p-3.5">
        <button
          type="button"
          onClick={handleAvatarClick}
          title="Change profile photo"
          className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-lg font-bold text-white ring-2 ring-white"
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.Emp_Name} className="h-full w-full object-cover" />
          ) : (
            initials(user.Emp_Name)
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            {uploadingAvatar ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-gray-900">{user.Emp_Name}</p>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                user.Status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${user.Status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
              {user.Status === "Active" ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-xs text-gray-500">{user.Emp_Id} &middot; {user.Designation}</p>
        </div>
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-100 p-4">
          <Field label="Full Name" value={user.Emp_Name} />
          <Field label="Username" value={user.Username} />
          <Field label="Email" value={user.Emp_Email} />
          <Field label="Phone Number" value={user.Phone_Number} />
          <Field label="Base Location" value={user.Base_Location} />
          <Field label="Designation" value={user.Designation} />
        </div>
      ) : (
        <form onSubmit={handleSaveClick} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Full Name</label>
            <input
              value={form.Emp_Name}
              onChange={handleChange("Emp_Name")}
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Username</label>
              <input
                value={user.Username || ""}
                disabled
                className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
              <input
                value={user.Emp_Email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Phone Number</label>
              <input
                value={form.Phone_Number}
                onChange={handleChange("Phone_Number")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Base Location</label>
              <input
                value={form.Base_Location}
                onChange={handleChange("Base_Location")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        isOpen={confirmSaveOpen}
        title="Save profile changes?"
        message="Updates your name, phone, and base location immediately."
        onConfirm={handleSave}
        onCancel={() => setConfirmSaveOpen(false)}
        isLoading={saving}
        confirmLabel="Save"
        loadingLabel="Saving..."
        confirmColor="indigo"
      />
    </div>
  );
};

export default ProfileCard;
