import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, ShieldCheck, FileText, ArrowRight, ArrowLeft, X, AlertCircle, Maximize2 } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'tenant' | 'user';
  onSuccess: (plan: 'tenant' | 'user', profilePicUrl?: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  planType,
  onSuccess,
}) => {
  const [screen, setScreen] = useState<'selfie' | 'id' | 'pop' | 'review' | 'success'>('selfie');

  // KYC form states
  const [selfieImage, setSelfieImage] = useState<string | null>(() => {
    return localStorage.getItem('timegig_profile_pic') || null;
  });
  const [idDocName, setIdDocName] = useState<string | null>(null);
  const [popDocName, setPopDocName] = useState<string | null>(null);

  // Camera, preview & error states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isFullScreenPreview, setIsFullScreenPreview] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const fee = planType === 'tenant' ? 'R299.99' : 'R29.99';
  const planTitle = planType === 'tenant' ? 'Tenant Sub (Enterprise Passive Income)' : 'User Sub (Individual Active Plan)';

  const stopCameraTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, []);

  // Connect video stream when camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isCameraActive]);

  // Hook rules guarantee: all hooks called unconditionally before early return
  if (!isOpen && !isCameraActive && !isFullScreenPreview) return null;

  // Native getUserMedia with permission handling & Android front camera support
  const startCamera = async () => {
    setCameraError(null);
    setUploadError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API (navigator.mediaDevices.getUserMedia) is not supported by your browser or device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera permission denied or unavailable:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please grant camera permission in your browser settings or select a photo from gallery.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No front-facing camera device was found on your device. Please select a photo from gallery.');
      } else {
        setCameraError(`Camera access error: ${err.message || 'Unknown error'}. Please upload from gallery.`);
      }
      stopCameraTracks();
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw normal or mirrored image onto canvas
        ctx.save();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setSelfieImage(dataUrl);
        // Permanent storage persistence
        localStorage.setItem('timegig_profile_pic', dataUrl);
        stopCameraTracks();
      }
    }
  };

  // File picker upload for face-only profile photograph
  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Invalid file type. Please select a face-only image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelfieImage(result);
        // Permanent storage persistence
        localStorage.setItem('timegig_profile_pic', result);
        stopCameraTracks();
      };
      reader.onerror = () => {
        setUploadError('Failed to read image file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (type: 'id' | 'pop', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'id') setIdDocName(file.name);
      if (type === 'pop') setPopDocName(file.name);
    }
  };

  const handleStartReview = () => {
    if (!selfieImage) {
      setUploadError('Face-only profile picture is required before activating your profile.');
      setScreen('selfie');
      return;
    }
    setScreen('review');
    setTimeout(() => {
      setScreen('success');
      onSuccess(planType, selfieImage);
    }, 4000);
  };

  return (
    <>
      {/* FULL-SCREEN LIVE CAMERA VIEWFINDER */}
      {isCameraActive && (
        <div className="fixed inset-0 z-[100] w-full h-[100dvh] bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
          {/* Live Full-Screen Video Background */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Oval Reticle Guide in Screen Center */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
            <div className="relative w-64 h-80 sm:w-80 sm:h-96 rounded-[50%] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
              <span className="absolute top-4 px-3.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-semibold text-white tracking-wide border border-white/20 shadow">
                Position Face Inside Oval
              </span>
              <span className="absolute bottom-4 px-3.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white/80 border border-white/20">
                Center face & tap capture
              </span>
            </div>
          </div>

          {/* Top Camera HUD Bar */}
          <div className="relative z-20 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <div className="text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                TimeGiG KYC Verification
              </span>
              <h3 className="text-sm sm:text-base font-bold">Face-Only Profile Photograph</h3>
            </div>
            <button
              type="button"
              onClick={stopCameraTracks}
              className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/20 transition-transform active:scale-95 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Camera Controls with Shutter Button */}
          <div className="relative z-20 flex items-center justify-around sm:justify-center sm:gap-16 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={stopCameraTracks}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
            >
              Cancel
            </button>

            {/* Circular Camera Shutter Button */}
            <button
              type="button"
              onClick={captureSelfie}
              aria-label="Capture Face Photograph"
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/25 active:scale-90 transition-transform shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-white active:bg-slate-200 transition-colors shadow-inner" />
            </button>

            <label className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md border border-white/20 cursor-pointer text-center active:scale-95 transition-transform">
              <span>Gallery</span>
              <input type="file" accept="image/*" capture="user" onChange={handleProfilePicUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* FULL-SCREEN PREVIEW OF CAPTURED / UPLOADED PHOTOGRAPH */}
      {isFullScreenPreview && selfieImage && (
        <div className="fixed inset-0 z-[110] w-full h-[100dvh] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between z-20 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-white/10">
            <div className="text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Verified Photo Preview
              </span>
              <h3 className="text-sm sm:text-base font-bold">Face-Only Profile Photograph</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsFullScreenPreview(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-transform active:scale-95 shadow"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
            <img
              src={selfieImage}
              alt="Face-Only Profile Photograph Full Screen"
              className="w-full h-full max-h-[82dvh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-white/10 z-20">
            <button
              type="button"
              onClick={() => setIsFullScreenPreview(false)}
              className="px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl border border-white/20 transition-transform active:scale-95"
            >
              Close Fullscreen
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFullScreenPreview(false);
                startCamera();
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Retake Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION & KYC MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[min(92dvh,calc(100dvh-1.5rem))] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-4 shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Subscription Activation ({fee}/mo)
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {planTitle}
                </h2>
              </div>
              <button
                onClick={() => {
                  stopCameraTracks();
                  onClose();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 space-y-5 overscroll-contain">
              {/* SCREEN 1: PROFILE PICTURE & CAMERA */}
              {screen === 'selfie' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Screen 1 of 3: Profile Photograph
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      33% Completed
                    </span>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-950 dark:text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {selfieImage ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <Camera className="w-5 h-5 text-emerald-500" />
                          <span>Face-Only Profile Photograph</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Saved & Ready
                        </span>
                      </div>

                      {/* Face-Only Photograph Fills The Screen/Card Container */}
                      <div
                        onClick={() => setIsFullScreenPreview(true)}
                        className="group relative w-full aspect-square sm:aspect-[4/3] max-h-[46dvh] rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-slate-950 cursor-pointer"
                      >
                        <img
                          src={selfieImage}
                          alt="Face-Only Profile Photograph"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 opacity-75 group-hover:opacity-90 transition-opacity" />
                        <div className="absolute top-3 left-3 bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Face Profile Ready</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFullScreenPreview(true);
                          }}
                          className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-xl shadow-lg border border-white/20 transition-transform active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span className="text-[11px]">Fill Screen</span>
                        </button>
                        <div className="absolute bottom-3 inset-x-3 text-center">
                          <span className="text-[11px] font-medium text-white/95 bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20">
                            Tap photo to fill entire screen
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsFullScreenPreview(true)}
                          className="py-2.5 px-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        >
                          <Maximize2 className="w-4 h-4 text-emerald-400" />
                          <span>Fill Screen</span>
                        </button>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Retake Live Selfie</span>
                        </button>
                        <label className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center shadow-sm">
                          <Upload className="w-4 h-4 text-blue-500" />
                          <span>Change File</span>
                          <input type="file" accept="image/*" capture="user" onChange={handleProfilePicUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <Camera className="w-5 h-5 text-blue-500" />
                          <span>Face-Only Profile Photograph</span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          Required
                        </span>
                      </div>

                      <div className="relative w-full aspect-square sm:aspect-[4/3] max-h-[46dvh] rounded-3xl border-2 border-dashed border-blue-400/80 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div className="w-20 h-24 rounded-[50%] border-2 border-blue-500/80 border-dashed flex items-center justify-center bg-blue-500/10 shadow-inner">
                          <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Face-Only Profile Photograph
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Take a live front-camera selfie filling the screen or select a face photo from your phone's gallery.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm pt-1">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Open Live Camera</span>
                          </button>
                          <label className="flex-1 py-3 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-2xl cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-center">
                            <Upload className="w-4 h-4 text-blue-500" />
                            <span>Phone Gallery</span>
                            <input type="file" accept="image/*" capture="user" onChange={handleProfilePicUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 2: ID DOCUMENT UPLOAD */}
              {screen === 'id' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Screen 2 of 3: ID Document
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      66% Completed
                    </span>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span>Upload Government ID Document</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Upload a clear photo or scanned PDF of your valid ID document, passport, or driver's license.
                    </p>

                    <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-blue-500 transition-colors bg-white dark:bg-slate-900">
                      <Upload className="w-8 h-8 text-blue-500 mb-2" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {idDocName ? idDocName : 'Click to browse device files'}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, PDF</span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload('id', e)} className="hidden" />
                    </label>

                    {idDocName && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>ID Document Attached Successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 3: PROOF OF PAYMENT UPLOAD */}
              {screen === 'pop' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Screen 3 of 3: Proof of Payment
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      99% Completed
                    </span>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span>Upload Proof of Payment ({fee})</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Upload your payment receipt or bank transfer confirmation showing the {fee} monthly subscription fee.
                    </p>

                    <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-emerald-500 transition-colors bg-white dark:bg-slate-900">
                      <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {popDocName ? popDocName : 'Click to browse device files'}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, PDF</span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload('pop', e)} className="hidden" />
                    </label>

                    {popDocName && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Proof of Payment Attached Successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 4: CIRCLE OF TOOLS & REVIEW LOADING SCREEN */}
              {screen === 'review' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-150">
                  <div className="relative flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                    <div className="absolute">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Verifying Your Credentials...
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Review takes 15 to 25 minutes. Our compliance team is validating your live selfie, ID, and proof of payment.
                    </p>
                  </div>
                </div>
              )}

              {/* SCREEN 5: SUCCESS */}
              {screen === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-150">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Subscription Activated Successfully!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                      Your account is now active under the <strong>{planTitle}</strong>. Enjoy full platform privileges and income generation.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      stopCameraTracks();
                      onClose();
                    }}
                    className="px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-lg"
                  >
                    Return to Map
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            {screen !== 'review' && screen !== 'success' && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-5 sm:px-8 py-3.5 bg-slate-50/70 dark:bg-slate-900/70 shrink-0 flex items-center justify-between">
                {screen === 'selfie' ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraTracks();
                        onClose();
                      }}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (screen === 'id') setScreen('selfie');
                      if (screen === 'pop') setScreen('id');
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}

                {screen === 'selfie' && (
                  <button
                    type="button"
                    disabled={!selfieImage}
                    onClick={() => {
                      stopCameraTracks();
                      setScreen('id');
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <span>Next: ID Document</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {screen === 'id' && (
                  <button
                    type="button"
                    disabled={!idDocName}
                    onClick={() => setScreen('pop')}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <span>Next: Proof of Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {screen === 'pop' && (
                  <button
                    type="button"
                    disabled={!popDocName || !selfieImage}
                    onClick={handleStartReview}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <span>Submit Activation</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
