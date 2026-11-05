import React, { useState, useEffect } from "react";

const CommentsSection = ({
  comments = "",
  onCommentsChange,
  disabled = false,
}) => {
  const [commentText, setCommentText] = useState(comments);

  useEffect(() => {
    setCommentText(comments);
  }, [comments]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setCommentText(newValue);
    if (onCommentsChange) {
      onCommentsChange(newValue);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={commentText}
        onChange={handleChange}
        disabled={disabled}
        rows={4}
        placeholder="Add notes or comments about this invoice..."
        className={`w-full rounded-lg text-sm resize-none px-3 py-2 outline-none transition-all ${
          disabled
            ? "bg-gray-50 text-gray-400 border-transparent cursor-not-allowed"
            : "bg-white border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        }`}
      />
      <div className="flex justify-between items-center mt-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
          {commentText.trim() ? "Note saved" : "Optional"}
        </span>
        <span className="text-[10px] font-bold text-gray-400 uppercase">
          {commentText.length} / 1000
        </span>
      </div>
    </div>
  );
};

export default CommentsSection;
