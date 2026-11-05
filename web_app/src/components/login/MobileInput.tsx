import React from "react";

const MobileInput = ({ value, onChange, disabled }) => {
  const handleChange = (e) => {
    // Allow only numbers
    const input = e.target.value.replace(/\D/g, "");
    if (input.length <= 12) {
      onChange(input);
    }
  };

  const formatMobileNumber = (number) => {
    if (!number) return "";

    // If user types 91 at start
    if (number.startsWith("91")) {
      const countryCode = number.slice(0, 2);
      const part1 = number.slice(2, 7);
      const part2 = number.slice(7, 12);
      return `+${countryCode} ${part1}${part2 ? " " + part2 : ""}`.trim();
    }

    // Default formatting
    const part1 = number.slice(0, 5);
    const part2 = number.slice(5, 10);
    return `${part1}${part2 ? " " + part2 : ""}`.trim();
  };

  return (
    <input
      type="tel"
      value={formatMobileNumber(value)}
      onChange={handleChange}
      placeholder="+91 00000 00000"
      disabled={disabled}
      className="form-input"
      required
    />
  );
};

export default MobileInput;
