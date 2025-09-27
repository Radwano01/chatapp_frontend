import React, { useState, useRef, useEffect } from 'react';

export default function VideoMessagePlayer({ src, onError }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = (e) => {
      setIsLoading(false);
      setHasError(true);
      if (onError) onError(e);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [src, onError]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-6 mt-2 max-w-xs">
        <div className="text-4xl mb-2">📹</div>
        <div className="text-sm text-gray-600 text-center mb-3">
          Video failed to load
        </div>
        <button
          onClick={handleRetry}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className="relative max-w-[200px] sm:max-w-xs rounded mt-2 overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-auto rounded"
        controls={showControls || isLoading}
        preload="metadata"
        poster=""
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-white text-xs">Loading video...</span>
          </div>
        </div>
      )}
    </div>
  );
}
