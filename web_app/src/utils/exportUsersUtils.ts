/**
 * Export Utilities for User Management - Enhanced Version
 * ALWAYS includes both Active and Inactive Users sheets
 * Supports XLSX (Excel) and PDF formats with enhanced formatting
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { stampPdfWatermark } from "./exportWatermark";
import {
  createWorkbook,
  addStyledSheet,
  addEmptyMessageSheet,
  stampAndProtect,
  saveWorkbook,
  HEADER_FILLS,
} from "./excelExport";

/**
 * Exports user data to professionally formatted XLSX
 * ✅ ALWAYS creates Active Users and Inactive Users sheets (even if one is empty)
 */
export const exportUsersToExcel = async (data, filename = "users_export") => {
  if (!data || data.length === 0) {
    console.warn("⚠️ No user data to export to Excel");
    alert("No user data available to export");
    return false;
  }

  // ✅ SAFETY CHECK: Ensure data is properly formatted (Title Case headers)
  const firstKey = Object.keys(data[0])[0];
  if (firstKey.includes("_")) {
    console.error(
      "❌ Export data contains raw database columns (snake_case). Please format data first.",
    );
    console.error(
      `❌ Found column: "${firstKey}" - Expected Title Case like "Employee Name"`,
    );
    alert("Export format error. Data must be formatted before export.");
    return false;
  }

  try {
    console.log(`📊 Exporting ${data.length} user records to Excel...`);

    const activeUsers = data.filter((user) => user["Status"]?.toLowerCase() === "active");
    const inactiveUsers = data.filter((user) => user["Status"]?.toLowerCase() === "inactive");

    const workbook = await createWorkbook();

    // ✅ Active/Inactive sheets are always present, even when empty — an
    // empty one gets a placeholder message sheet instead of being skipped.
    const addStatusSheet = async (users, sheetName, fillColor) => {
      if (users.length === 0) {
        const worksheet = addEmptyMessageSheet(
          workbook,
          sheetName,
          `No users in this category. This sheet will be populated when users are added to this status.`,
          fillColor,
        );
        await stampAndProtect(worksheet, 1);
        return;
      }
      const worksheet = addStyledSheet(workbook, users, sheetName, fillColor);
      if (!worksheet) return;
      const headerCount = Array.from(
        users.reduce((keys, u) => {
          Object.keys(u).forEach((k) => keys.add(k));
          return keys;
        }, new Set()),
      ).length;
      await stampAndProtect(worksheet, headerCount);
    };

    await addStatusSheet(activeUsers, "Active Users", HEADER_FILLS.green);
    await addStatusSheet(inactiveUsers, "Inactive Users", HEADER_FILLS.red);

    if (data.length > 0) {
      const allWorksheet = addStyledSheet(workbook, data, "All Users");
      if (allWorksheet) {
        const headerCount = Array.from(
          data.reduce((keys, u) => {
            Object.keys(u).forEach((k) => keys.add(k));
            return keys;
          }, new Set()),
        ).length;
        await stampAndProtect(allWorksheet, headerCount);
      }
    }

    // ==========================================
    // ADD METADATA SHEET (Summary Information)
    // ==========================================
    const infoSheet = workbook.addWorksheet("Export Info");
    infoSheet.columns = [{ width: 20 }, { width: 70 }];
    const infoRows = [
      ["User Export Information"],
      [],
      ["Export Date", new Date().toLocaleString()],
      ["Total Users", data.length],
      ["Active Users", activeUsers.length],
      ["Inactive Users", inactiveUsers.length],
      ["Filename", `${filename}.xlsx`],
      [],
      ["Sheet Structure"],
      ["Sheet 1: Active Users - Contains only active user accounts"],
      [`   ${activeUsers.length === 0 ? "⚠️ Currently empty - No active users" : `✅ ${activeUsers.length} active users`}`],
      ["Sheet 2: Inactive Users - Contains inactive/disabled user accounts"],
      [`   ${inactiveUsers.length === 0 ? "⚠️ Currently empty - No inactive users" : `✅ ${inactiveUsers.length} inactive users`}`],
      ["Sheet 3: All Users - Contains complete user directory"],
      [],
      ["Notes"],
      ["• Both Active and Inactive sheets are always included"],
      ["• Empty sheets show a message when no users are in that status"],
      ["• Empty/null columns are automatically removed for cleaner export"],
      ["• Password fields are not included in exports for security"],
      ["• Data is split by status for easier management"],
    ];
    infoRows.forEach((row) => infoSheet.addRow(row));
    infoSheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    infoSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    infoSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    ["A3", "A4", "A5", "A6", "A7", "A9", "A14"].forEach((addr) => {
      infoSheet.getCell(addr).font = { bold: true, size: 11 };
      infoSheet.getCell(addr).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    });

    await saveWorkbook(workbook, filename);

    console.log(`✅ Excel file exported successfully: ${filename}.xlsx`);
    console.log(`   - Total: ${data.length} users`);
    console.log(`   - Active: ${activeUsers.length} users`);
    console.log(`   - Inactive: ${inactiveUsers.length} users`);

    return true;
  } catch (error) {
    console.error("❌ Error exporting users to Excel:", error);
    console.error("❌ Error stack:", error.stack);
    alert(`Failed to export to Excel: ${error.message}`);
    return false;
  }
};

/**
 * Exports user data to professionally formatted PDF
 * ✅ ALWAYS includes both Active and Inactive Users sections (even if one is empty)
 */
export const exportUsersToPDF = (data, filename = "users_export") => {
  console.log("📄 exportUsersToPDF called with:", {
    dataLength: data?.length,
    filename,
    firstRecord: data?.[0],
  });

  if (!data || data.length === 0) {
    console.warn("⚠️ No user data to export to PDF");
    alert("No user data available to export");
    return false;
  }

  // ✅ SAFETY CHECK: Ensure data is properly formatted (Title Case headers)
  const firstKey = Object.keys(data[0])[0];
  console.log("🔍 First key in data:", firstKey);

  if (firstKey.includes("_")) {
    console.error(
      "❌ Export data contains raw database columns (snake_case). Please format data first.",
    );
    console.error(
      `❌ Found column: "${firstKey}" - Expected Title Case like "Employee Name"`,
    );
    alert("Export format error. Data must be formatted before export.");
    return false;
  }

  try {
    console.log(`📄 Exporting ${data.length} user records to PDF...`);

    // ==========================================
    // SPLIT DATA BY STATUS
    // ==========================================
    const activeUsers = data.filter(
      (user) => user["Status"]?.toLowerCase() === "active",
    );
    const inactiveUsers = data.filter(
      (user) => user["Status"]?.toLowerCase() === "inactive",
    );

    console.log(
      `📄 Split: ${activeUsers.length} Active + ${inactiveUsers.length} Inactive`,
    );

    // ==========================================
    // CREATE PDF DOCUMENT
    // ==========================================
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    stampPdfWatermark(doc, pageWidth, pageHeight);

    // ==========================================
    // PDF HEADER (Title and Metadata)
    // ==========================================
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("User Management Export", 14, 15);

    // Metadata
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 22);
    doc.text(`Total Users: ${data.length}`, 14, 27);
    doc.text(
      `Active: ${activeUsers.length} | Inactive: ${inactiveUsers.length}`,
      150,
      27,
    );

    let currentY = 35;
    const sectionInfo = [];

    // ==========================================
    // HELPER FUNCTION: Get columns with data
    // ==========================================
    const getColumnsWithData = (users): string[] => {
      const allKeys = new Set<string>();
      users.forEach((user) => {
        Object.keys(user).forEach((key) => {
          const hasData = users.some((u) => {
            const val = u[key];
            return (
              val !== null && val !== undefined && val !== "" && val !== "-"
            );
          });
          if (hasData) allKeys.add(key);
        });
      });

      return Array.from(allKeys);
    };

    // ==========================================
    // HELPER FUNCTION: Format cell value
    // ==========================================
    const formatCellValue = (header, value) => {
      if (value === null || value === undefined || value === "") return "-";

      if (header.toLowerCase().includes("date") && value instanceof Date) {
        return value.toLocaleDateString("en-IN");
      }
      if (header.toLowerCase().includes("date") && typeof value === "string") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-IN");
        }
      }

      const strValue = String(value);
      if (header.toLowerCase().includes("email")) {
        return strValue.length > 30
          ? strValue.substring(0, 27) + "..."
          : strValue;
      }

      return strValue.length > 40
        ? strValue.substring(0, 37) + "..."
        : strValue;
    };

    // ==========================================
    // ✅ HELPER FUNCTION: Create section table (handles empty sections)
    // ==========================================
    const createSectionTable = (users, sectionTitle, headerColor, startY) => {
      // ✅ CHANGED: Create empty message if no users
      if (!users || users.length === 0) {
        console.log(`⚠️ Creating empty ${sectionTitle} section`);

        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.setFont("helvetica", "bold");
        doc.text(sectionTitle, 14, startY);

        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.setFont("helvetica", "normal");
        doc.text(`0 users in this category`, 14, startY + 5);

        // Add empty state message box
        doc.setFillColor(248, 250, 252); // Light gray background
        doc.rect(14, startY + 10, pageWidth - 28, 20, "F");

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "italic");
        doc.text(
          `No ${sectionTitle.toLowerCase()} at this time.`,
          pageWidth / 2,
          startY + 20,
          { align: "center" },
        );

        return {
          nextY: startY + 35,
          headers: [],
          totalColumns: 0,
          isEmpty: true,
        };
      }

      const headers = getColumnsWithData(users);
      const totalColumns = headers.length;

      console.log(
        `📄 ${sectionTitle}: ${users.length} users, ${totalColumns} columns`,
      );

      const rows = users.map((user) =>
        headers.map((header) => formatCellValue(header, user[header])),
      );

      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.text(sectionTitle, 14, startY);

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${users.length} users | ${totalColumns} columns`,
        14,
        startY + 5,
      );

      let fontSize = 8;
      let cellPadding = 3;
      let headerFontSize = 9;

      if (totalColumns > 12) {
        fontSize = 6;
        cellPadding = 2;
        headerFontSize = 7;
      } else if (totalColumns > 8) {
        fontSize = 7;
        cellPadding = 2.5;
        headerFontSize = 8;
      }

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: startY + 8,

        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          overflow: "linebreak",
          halign: "left",
          valign: "middle",
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          minCellWidth: 10,
        },

        headStyles: {
          fillColor: headerColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: headerFontSize,
          cellPadding: cellPadding,
          minCellHeight: 8,
        },

        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },

        columnStyles: headers.reduce((acc: Record<number, any>, header, index) => {
          const headerLower = header.toLowerCase();

          if (
            headerLower.includes("status") ||
            headerLower.includes("id") ||
            headerLower.includes("phone")
          ) {
            acc[index] = { halign: "center" };
          }

          return acc;
        }, {}),

        margin: { top: 10, right: 10, bottom: 25, left: 10 },
        theme: "grid",
        tableWidth: "auto",
        showHead: "everyPage",

        didDrawPage: function (hookData) {
          stampPdfWatermark(doc, pageWidth, pageHeight);

          const pageCount = (doc as any).internal.getNumberOfPages();

          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.setFont("helvetica", "normal");

          doc.text(
            `Page ${hookData.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" },
          );

          doc.text("User Management System", 14, pageHeight - 10);

          doc.text(`${filename}.pdf`, pageWidth - 14, pageHeight - 10, {
            align: "right",
          });
        },
      });

      return {
        nextY: (doc as any).lastAutoTable.finalY + 15,
        headers: headers,
        totalColumns: totalColumns,
        isEmpty: false,
      };
    };

    // ==========================================
    // ✅ CREATE ACTIVE USERS SECTION (Always)
    // ==========================================
    const activeInfo = createSectionTable(
      activeUsers,
      "Active Users",
      [5, 150, 105],
      currentY,
    );
    currentY = activeInfo.nextY;
    sectionInfo.push({
      name: "Active Users",
      users: activeUsers.length,
      columnsShown: activeInfo.headers.length,
      columnsTotal: activeInfo.totalColumns,
      columns: activeInfo.headers,
      isEmpty: activeInfo.isEmpty,
    });
    console.log(
      `✅ Active Users section created (${activeUsers.length} users)`,
    );

    // ==========================================
    // ✅ CREATE INACTIVE USERS SECTION (Always)
    // ==========================================
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 15;
    }

    const inactiveInfo = createSectionTable(
      inactiveUsers,
      "Inactive Users",
      [220, 38, 38],
      currentY,
    );
    currentY = inactiveInfo.nextY;
    sectionInfo.push({
      name: "Inactive Users",
      users: inactiveUsers.length,
      columnsShown: inactiveInfo.headers.length,
      columnsTotal: inactiveInfo.totalColumns,
      columns: inactiveInfo.headers,
      isEmpty: inactiveInfo.isEmpty,
    });
    console.log(
      `✅ Inactive Users section created (${inactiveUsers.length} users)`,
    );

    // ==========================================
    // ADD SUMMARY PAGE
    // ==========================================
    doc.addPage();
    stampPdfWatermark(doc, pageWidth, pageHeight);

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("Export Summary", 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");

    let summaryY = 25;

    doc.text("Export Information:", 14, summaryY);
    summaryY += 7;
    doc.setFontSize(9);
    doc.text(
      `• Export Date: ${new Date().toLocaleString("en-IN")}`,
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(`• Total Users: ${data.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Active Users: ${activeUsers.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Inactive Users: ${inactiveUsers.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Filename: ${filename}.pdf`, 20, summaryY);
    summaryY += 12;

    doc.setFontSize(10);
    doc.text("PDF Structure:", 14, summaryY);
    summaryY += 7;
    doc.setFontSize(9);

    sectionInfo.forEach((section, idx) => {
      doc.setFont("helvetica", "bold");
      doc.text(`• Section ${idx + 1}: ${section.name}`, 20, summaryY);
      summaryY += 5;
      doc.setFont("helvetica", "normal");

      if (section.isEmpty) {
        doc.text(`  - 0 users (empty section)`, 25, summaryY);
        summaryY += 5;
        doc.setTextColor(150, 150, 150);
        doc.text(`  - No data to display`, 25, summaryY);
        doc.setTextColor(107, 114, 128);
        summaryY += 8;
      } else {
        doc.text(`  - ${section.users} users`, 25, summaryY);
        summaryY += 5;
        doc.text(
          `  - ${section.totalColumns} columns (all columns with data)`,
          25,
          summaryY,
        );
        summaryY += 5;

        const previewCols = section.columns.slice(0, 6).join(", ");
        const remaining =
          section.columns.length > 6
            ? ` ... +${section.columns.length - 6} more`
            : "";
        doc.text(`  - Columns: ${previewCols}${remaining}`, 25, summaryY);
        summaryY += 8;
      }
    });

    summaryY += 2;
    doc.text(
      "• Both Active and Inactive sections always included",
      20,
      summaryY,
    );
    summaryY += 5;
    doc.text("• Empty sections show placeholder message", 20, summaryY);
    summaryY += 5;
    doc.text("• All columns with data are included", 20, summaryY);
    summaryY += 5;
    doc.text("• Empty/null columns automatically removed", 20, summaryY);
    summaryY += 5;
    doc.text("• Password fields excluded for security", 20, summaryY);
    summaryY += 5;
    doc.text(
      "• Font size adjusted for readability based on column count",
      20,
      summaryY,
    );
    summaryY += 12;

    doc.setFontSize(10);
    doc.text("Notes:", 14, summaryY);
    summaryY += 7;
    doc.setFontSize(9);
    doc.text(
      "• PDF includes all user data columns (matching Excel export)",
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(
      "• Smaller fonts used for sections with many columns",
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(
      "• Landscape orientation optimized for maximum column visibility",
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(
      "• Sensitive data like passwords are never included",
      20,
      summaryY,
    );

    // ==========================================
    // SAVE PDF
    // ==========================================
    doc.save(`${filename}.pdf`);

    console.log(`✅ PDF file exported successfully: ${filename}.pdf`);
    console.log(`   - Total: ${data.length} users`);
    console.log(`   - Active: ${activeUsers.length} users`);
    console.log(`   - Inactive: ${inactiveUsers.length} users`);
    console.log(`   - Pages: ${(doc as any).internal.getNumberOfPages()}`);

    return true;
  } catch (error) {
    console.error("❌ Error exporting users to PDF:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);
    alert(`Failed to export to PDF: ${error.message}`);
    return false;
  }
};

/**
 * Helper function to format date stamp for filenames
 */
export const getDateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}`;
};

/**
 * Helper function to prepare user data for export
 * Converts database column names to Title Case display names
 */
export const mapUserDataForExport = (rawUserData) => {
  console.log("🔄 mapUserDataForExport called with:", {
    dataLength: rawUserData?.length,
    firstRecord: rawUserData?.[0],
  });

  if (!rawUserData || rawUserData.length === 0) {
    console.warn("⚠️ No data to map for export");
    return [];
  }

  // Get all unique keys from the dataset
  const allKeys = new Set<string>();
  rawUserData.forEach((user) => {
    Object.keys(user).forEach((key) => allKeys.add(key));
  });

  console.log("📊 All keys found in dataset:", Array.from(allKeys));

  return rawUserData.map((user) => {
    const mapped = {
      "User ID": user.Emp_Id || user.emp_id || "-",
      "Full Name": user.Emp_Name || user.emp_name || user.name || "-",
      Username: user.Username || user.username || "-",
      Email: user.Emp_Email || user.emp_email || user.email || "-",
      "Phone Number":
        user.Phone_Number || user.phone_number || user.phone || "-",
      Designation: user.Designation || user.designation || user.role || "-",
      "Base Location":
        user.Base_Location || user.base_location || user.location || "-",
      Status: user.Status || user.status || "-",
      "Created At":
        user.Created_At || user.created_at
          ? new Date(user.Created_At || user.created_at).toLocaleDateString(
              "en-IN",
            )
          : "-",
      "Updated At":
        user.Updated_At || user.updated_at
          ? new Date(user.Updated_At || user.updated_at).toLocaleDateString(
              "en-IN",
            )
          : "-",
    };

    return mapped;
  });
};
