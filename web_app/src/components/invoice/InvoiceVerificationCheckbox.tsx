import React from "react";
import { CheckCircle2 } from "lucide-react";

const InvoiceVerificationCheckbox = ({ invChecked }) => {
  return (
    <div
      className={`border rounded-xl p-4 transition-colors ${
        invChecked
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="inv-checkbox"
          checked={invChecked}
          readOnly
          disabled
          className="w-5 h-5 text-emerald-600 border-slate-300 rounded cursor-not-allowed"
        />
        <div className="flex-1">
          <label
            htmlFor="inv-checkbox"
            className={`block text-sm font-bold cursor-not-allowed ${
              invChecked ? "text-emerald-900" : "text-slate-700"
            }`}
          >
            Invoice Verified (INV)
          </label>
          <p
            className={`text-xs mt-0.5 ${
              invChecked ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {invChecked
              ? "✓ Data has been reviewed and modified"
              : "Will be marked automatically after saving edits"}
          </p>
        </div>
        {invChecked && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
      </div>
    </div>
  );
};

export default InvoiceVerificationCheckbox;
