import React, { useState, useRef, useEffect } from 'react';

export default function AudioMessagePlayer({ src, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * totalDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 max-w-sm shadow-sm">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="flex-shrink-0 w-10 h-10 bg-blue-500 disabled:bg-gray-400 rounded-full flex items-center justify-center text-white shadow-md"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Audio Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 mb-1">🎤 Voice Message</div>
          
          {/* Progress Bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-2 bg-gray-200 rounded-full cursor-pointer mb-1"
          >
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-lg"
              style={{ left: `calc(${progressPercentage}% - 8px)` }}
            />
          </div>
          
          {/* Time Display */}
          <div className="flex justify-between text-xs text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Waveform Visual */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className={`w-1 bg-gray-300 rounded-full ${
                isPlaying && (i % 3 === 0 || Math.random() > 0.6)
                  ? 'bg-blue-500 h-4'
                  : 'h-2'
              }`}
              style={{
                animationDelay: `${i * 100}ms`,
                animation: isPlaying ? 'pulse 1.5s infinite' : 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
