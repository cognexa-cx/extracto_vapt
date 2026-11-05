import React from "react";
import Navbar from "../components/layout/Navbar";

/**
 * Vender Master Page
 * Page for managing vendors
 */
const VenderMaster = () => {
  return (
    <div>
      <Navbar />
      <main className="p-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Vender Master
          </h2>
          <p className="text-gray-600">
            Vender master functionality will be implemented here
          </p>
        </div>
      </main>
    </div>
  );
};

export default VenderMaster;
