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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>Evidence Photo</span>
          <span className="text-status-open font-bold">*</span>
        </label>
        {fileDetails && (
          <span className="text-[11px] font-mono text-status-verified font-medium flex items-center gap-1">
            <Check className="w-3 h-3" /> Ready ({fileDetails.sizeMb}MB)
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Hidden Canvas for Camera Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* State 1: Photo Preview with Retake Option */}
      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-border bg-surface-card shadow-sm">
          <img
            src={previewUrl}
            alt="Evidence preview"
            className="w-full h-64 object-cover"
          />

          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
            <div className="text-white text-xs truncate max-w-[200px]">
              <span className="font-semibold block truncate">{fileDetails?.name}</span>
              <span className="text-[10px] text-white/80 font-mono">
                {fileDetails?.sizeMb} MB &bull; High Resolution
              </span>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={handleRetake}
              className="py-1.5 px-3 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          </div>
        </div>
      ) : streamActive ? (
        /* State 2: Live Camera View */
        <div className="relative rounded-2xl overflow-hidden border border-border bg-black shadow-lg">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-72 object-cover"
          />

          {/* Grid lines overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 border border-white/40">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>

          {/* Shutter controls */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-around">
            <button
              type="button"
              onClick={stopCameraStream}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={takeSnapshot}
              className="w-16 h-16 rounded-full border-4 border-white bg-status-open active:scale-95 transition-transform flex items-center justify-center shadow-lg cursor-pointer"
              title="Take Photo"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
              title="Upload File Instead"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* State 3: Idle / Capture Options */
        <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-surface-card gap-4 transition-colors hover:border-muted">
          <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center shadow-inner">
            <Camera className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">
              Capture Photo Evidence
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
              Every verification comes from photo evidence, not checkboxes. Max 10MB.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
            <button
              type="button"
              disabled={disabled}
              onClick={startCameraStream}
              className="flex-1 py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>Use Camera</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-surface border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      )}

      {/* Image Error Alert (e.g. Image too large) */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-status-open/10 border border-status-open/30 text-status-open text-xs flex items-start gap-2 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
