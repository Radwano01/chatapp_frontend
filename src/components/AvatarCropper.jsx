import React, { useState, useRef, useEffect } from 'react';

export default function AvatarCropper({ imageFile, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (imageFile) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        // Calculate initial crop area to be centered
        const minDimension = Math.min(img.width, img.height);
        const cropSize = Math.min(200, minDimension);
        setCropArea({
          x: (img.width - cropSize) / 2,
          y: (img.height - cropSize) / 2,
          size: cropSize
        });
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !image) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const deltaX = mouseX - dragStart.x;
    const deltaY = mouseY - dragStart.y;

    const scaleX = imageSize.width / canvasRef.current.width;
    const scaleY = imageSize.height / canvasRef.current.height;

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(imageSize.width - prev.size, prev.x + deltaX * scaleX)),
      y: Math.max(0, Math.min(imageSize.height - prev.size, prev.y + deltaY * scaleY))
    }));

    setDragStart({ x: mouseX, y: mouseY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (!image) return;

    const delta = e.deltaY > 0 ? -10 : 10;
    const newSize = Math.max(50, Math.min(Math.min(imageSize.width, imageSize.height), cropArea.size + delta));
    
    setCropArea(prev => ({
      ...prev,
      size: newSize,
      x: Math.max(0, Math.min(imageSize.width - newSize, prev.x)),
      y: Math.max(0, Math.min(imageSize.height - newSize, prev.y))
    }));
  };

  useEffect(() => {
    const drawCanvas = () => {
      if (!image || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      const displaySize = 400;
      canvas.width = displaySize;
      canvas.height = displaySize;

      // Calculate scale to fit image in canvas
      const scale = Math.min(displaySize / image.width, displaySize / image.height);
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      // Center the image
      const x = (displaySize - scaledWidth) / 2;
      const y = (displaySize - scaledHeight) / 2;

      // Clear canvas
      ctx.clearRect(0, 0, displaySize, displaySize);

      // Draw image
      ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

      // Draw overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, displaySize, displaySize);

      // Draw crop area
      const cropX = x + (cropArea.x * scale);
      const cropY = y + (cropArea.y * scale);
      const cropSize = cropArea.size * scale;

      // Clear the crop area
      ctx.clearRect(cropX, cropY, cropSize, cropSize);
      ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.size, cropArea.size, cropX, cropY, cropSize, cropSize);

      // Draw crop border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropX, cropY, cropSize, cropSize);

      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + cropSize - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX - handleSize/2, cropY + cropSize - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + cropSize - handleSize/2, cropY + cropSize - handleSize/2, handleSize, handleSize);
    };

    drawCanvas();
  }, [image, cropArea, isDragging]);

  const handleCrop = () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 200;
    canvas.height = 200;

    // Draw circular crop
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.size, cropArea.size, 0, 0, 200, 200);
    ctx.restore();

    canvas.toBlob((blob) => {
      onCrop(blob);
    }, 'image/png');
  };

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 text-center">Crop Your Avatar</h3>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Drag to move, scroll to resize. The circular area will be your avatar.
        </p>
        
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-lg cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            style={{ width: '400px', height: '400px' }}
          />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  );
}
