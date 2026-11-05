import React from "react";
import "./ThankYouMessage.css";

function ThankYouMessage() {
  return (
    <div className="thankyou-container">
      <div className="thankyou-circle" />
      <div className="thankyou-content">
        <div className="thankyou-check">
          <svg viewBox="0 0 52 52">
            <circle className="thankyou-check-circle" cx="26" cy="26" r="24" fill="none" />
            <path className="thankyou-check-mark" fill="none" d="M14 27l7 7 16-16" />
          </svg>
        </div>
        <h1 className="thankyou-title">Thanks for using Extracto</h1>
        <p className="thankyou-subtitle">We appreciate your time and support.</p>
      </div>
    </div>
  );
}

export default ThankYouMessage;
