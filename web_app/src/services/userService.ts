// src/services/userService.js

// Use environment variable if available, otherwise fallback to hardcoded URL
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/usermanagement`;

/**
 * User Service - Handles all user management API calls
 */
class UserService {
  /**
   * Register a new employee/user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - API response
   */
  async registerUser(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if needed
          // "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 409) {
          throw new Error("User with this email or username already exists");
        } else if (response.status === 400) {
          throw new Error(data.message || "Invalid user data provided");
        } else if (response.status === 500) {
          throw new Error("Server error. Please try again later");
        }

        throw new Error(data.message || "Failed to register user");
      }

      return {
        success: true,
        data: data.data,
        message: data.message || "User registered successfully",
      };
    } catch (error) {
      console.error("User registration error:", error);

      // Handle network errors
      if (error.name === "TypeError" && error.message === "Failed to fetch") {
        throw new Error(
          "Network error. Please check your connection and try again.",
        );
      }

      throw new Error(error.message || "An unexpected error occurred");
    }
  }

  /**
   * Get all users (if endpoint exists)
   * @returns {Promise<Object>}
   */
  async getAllUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch users");
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message || "Users fetched successfully",
      };
    } catch (error) {
      console.error("Fetch users error:", error);
      throw new Error(error.message || "Failed to fetch users");
    }
  }

  /**
   * Validate email format with specific error messages
   * @param {string} email
   * @returns {Object} - { isValid: boolean, message: string }
   */
  validateEmail(email) {
    if (!email?.trim()) {
      return {
        isValid: false,
        message: "Email is required",
      };
    }

    // Remove whitespace
    email = email.trim().toLowerCase();

    // Comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    // Check email length
    if (email.length > 100) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    // Check for consecutive dots
    if (email.includes("..")) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    // Split and validate parts
    const parts = email.split("@");
    if (parts.length !== 2) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    const [localPart, domain] = parts;

    // Validate local part
    if (!localPart || localPart.startsWith(".") || localPart.endsWith(".")) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    // Validate domain part
    if (
      !domain ||
      domain.startsWith(".") ||
      domain.endsWith(".") ||
      !domain.includes(".")
    ) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    // Check domain extension (must be 2-6 characters - covers .co to .museum)
    const domainParts = domain.split(".");
    const extension = domainParts[domainParts.length - 1];

    // TLD should be between 2-6 characters (.co, .com, .info, .museum)
    if (extension.length < 2 || extension.length > 6) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    // Check if extension contains only letters
    if (!/^[a-zA-Z]+$/.test(extension)) {
      return {
        isValid: false,
        message: "Please enter a valid email address",
      };
    }

    return { isValid: true, message: "Email is valid" };
  }

  /**
   * Validate phone number (10 digits)
   * @param {string} phone
   * @returns {boolean}
   */
  validatePhone(phone) {
    return /^\d{10}$/.test(phone);
  }

  /**
   * Validate password strength
   * @param {string} password
   * @returns {Object} - { isValid: boolean, message: string }
   */
  validatePassword(password) {
    if (password.length < 8) {
      return {
        isValid: false,
        message: "Password must be at least 8 characters long",
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one number",
      };
    }

    return { isValid: true, message: "Password is strong" };
  }

  /**
   * Format user data for API
   * @param {Object} formData
   * @returns {Object} - Formatted data for API
   */
  formatUserData(formData: any) {
    // Only include Emp_Id if it's provided
    const payload: Record<string, any> = {
      Emp_Name: formData.name.trim(),
      Emp_Email: formData.email.trim().toLowerCase(),
      Username: formData.username.trim().toLowerCase(),
      Password: formData.password,
      Designation: formData.designation.trim(),
      Base_Location: formData.baseLocation.trim(),
      Phone_Number: formData.phone.trim(),
    };

    // Only add Emp_Id if user provided one
    if (formData.empId && formData.empId.trim()) {
      payload.Emp_Id = formData.empId.trim().toUpperCase();
    }

    return payload;
  }

  /**
   * Sanitize user input to prevent XSS
   * @param {string} input
   * @returns {string}
   */
  sanitizeInput(input) {
    if (typeof input !== "string") return input;

    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * ⚠️ FRONTEND ONLY - Check field uniqueness (placeholder for backend)
   *
   * TODO BACKEND: Create endpoint /api/usermanagement/check-unique
   * Expected request: POST { field: string, value: string, excludeEmpId?: string }
   * Expected response: { isUnique: boolean }
   *
   * @param {string} field - Field name (Username, Emp_Email, Phone_Number)
   * @param {string} value - Value to check
   * @returns {Promise<Object>} - { isUnique: boolean }
   */
  async checkFieldUniqueness(field, value) {
    try {
      // ⚠️ FRONTEND ONLY - For now, just do basic validation
      // Backend will perform actual uniqueness check on submit

      console.log(`🔍 Frontend validation for ${field}: ${value}`);

      // Simulate API delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Uncomment when backend endpoint is ready
      // const response = await fetch(`${API_BASE_URL}/check-unique`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ field, value })
      // });
      // if (!response.ok) {
      //   throw new Error('Uniqueness check failed');
      // }
      // const data = await response.json();
      // return { isUnique: data.isUnique };

      // For now, assume all values are unique
      // Backend will perform actual validation on final submit
      return { isUnique: true };
    } catch (error) {
      console.error("Error checking field uniqueness:", error);
      // Return true to allow form submission (backend will validate)
      return { isUnique: true };
    }
  }
}

export default new UserService();
