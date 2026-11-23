'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, AlertCircle, X, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export function CameraCapture({ onCapture, disabled = false }: CameraCaptureProps) {
  const [streamActive, setStreamActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; sizeMb: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  const startCameraStream = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser. Please upload a photo file.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamActive(true);
    } catch (err: unknown) {
      const error = err as Error;
      stopCameraStream();
      setErrorMsg(
        error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please choose a photo from your device.'
          : error.message || 'Unable to open camera stream. Please use file upload.'
      );
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `evidence-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        stopCameraStream();
        handleSelectedFile(capturedFile);
      },
      'image/jpeg',
      0.9
    );
  };

  const handleSelectedFile = (file: File) => {
    setErrorMsg(null);

    // Validate size (Acceptance check 5: reject images > 10MB with clear error)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`Image too large (max 10MB). Selected image is ${sizeMb}MB.`);
      onCapture(null);
      return;
    }

    if (file.type && !file.type.startsWith('image/')) {
      setErrorMsg('Invalid file format: Please select a valid photo (JPEG, PNG, WebP).');
      onCapture(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFileDetails({
      name: file.name,
      sizeMb: (file.size / (1024 * 1024)).toFixed(2),
    });
    onCapture(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectedFile(file);
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileDetails(null);
    setErrorMsg(null);
    onCapture(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>Photographic Evidence</span>
          <span className="text-status-open font-bold">*</span>
        </label>
        {fileDetails && (
          <span className="text-[11px] font-mono text-status-verified font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Ready ({fileDetails.sizeMb}MB)
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={handleFileInputChange}
      />

      {/* Hidden Canvas for Video Snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error Message */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-status-open/10 border border-status-open/30 text-status-open text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-[11px]">{errorMsg}</span>
        </div>
      )}

      {/* Preview Screen */}
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-surface-card">
          <img
            src={previewUrl}
            alt="Complaint evidence preview"
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3">
            <div className="flex items-center justify-between text-white text-xs">
              <span className="font-mono text-[11px] truncate max-w-[200px]">
                {fileDetails?.name}
              </span>
              <button
                type="button"
                onClick={handleRetake}
                disabled={disabled}
                className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            </div>
          </div>
        </div>
      ) : streamActive ? (
        /* Active Video Viewfinder */
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-64 object-cover"
          />
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 px-4">
            <button
              type="button"
              onClick={stopCameraStream}
              className="px-3 py-2 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-semibold transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={takeSnapshot}
              className="w-14 h-14 rounded-full border-4 border-white bg-blue-600 active:scale-95 flex items-center justify-center text-white shadow-lg transition-transform cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-white/30" />
            </button>
          </div>
        </div>
      ) : (
        /* Default Intake Trigger Buttons */
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={startCameraStream}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-dashed border-border bg-surface hover:bg-surface-hover hover:border-blue-600 transition-all cursor-pointer min-h-[100px] text-center group focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="w-10 h-10 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Open Camera
              </span>
              <span className="text-[10px] text-muted-foreground">
                Live capture on site
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-dashed border-border bg-surface hover:bg-surface-hover hover:border-blue-600 transition-all cursor-pointer min-h-[100px] text-center group focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 text-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Upload Photo
              </span>
              <span className="text-[10px] text-muted-foreground">
                Select JPEG/PNG (max 10MB)
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
