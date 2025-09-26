import React from "react";

export default function ImagePreviewModal({ imageUrl, alt, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={onClose}>
      <div className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-opacity-75 transition"
        >
          ✕
        </button>
        
        {/* Image with responsive max dimensions */}
        <img
          src={imageUrl}
          alt={alt || "Preview"}
          className="max-w-[85vw] max-h-[80vh] sm:max-w-[90vw] sm:max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
          style={{ 
            maxWidth: 'min(1200px, 85vw)', 
            maxHeight: 'min(800px, 80vh)' 
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
