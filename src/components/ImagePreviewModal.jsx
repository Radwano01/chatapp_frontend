import React from "react";

export default function ImagePreviewModal({ imageUrl, alt, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition"
        >
          ✕
        </button>
        
        {/* Image */}
        <img
          src={imageUrl}
          alt={alt || "Preview"}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
