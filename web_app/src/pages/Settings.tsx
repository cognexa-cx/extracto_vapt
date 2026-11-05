import React, { useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import ProfileCard from "../components/settings/ProfileCard";
import PasswordCard from "../components/settings/PasswordCard";
import SystemStatusCard from "../components/settings/SystemStatusCard";
import userManagementService from "../services/userManagementService";
import { useAppContext } from "../context/AppContext";

/**
 * Settings — account (profile + password) and a live system status check.
 * Every control here is wired to a real endpoint or real app state;
 * nothing is a placeholder.
 *
 * On mount, refreshes `user` straight from the DB (GET /me) instead of
 * trusting whatever was cached in localStorage at login time — so opening
 * this page always shows your actual current data, even if it was edited
 * from another device/tab since you last logged in here.
 */
const Settings = () => {
  const { user, updateUser } = useAppContext();

  useEffect(() => {
    if (!user?.Emp_Id) return;
    userManagementService
      .getMe()
      .then((fresh) => updateUser({ ...user, ...fresh }))
      .catch(() => {
        // Non-fatal — the page still works off whatever was already cached.
      });
    // Only ever needs to run once per mount (opening the page), not on
    // every `user` change updateUser itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your profile, security & app preferences" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <ProfileCard />
          <PasswordCard />
        </div>

        <div className="space-y-5">
          <SystemStatusCard />
        </div>
      </div>
    </div>
  );
};

export default Settings;
