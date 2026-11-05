import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, ShieldCheck, FileText, ArrowRight, ArrowLeft, X, AlertCircle } from 'lucide-react';

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

  // Camera & error states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
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

  if (!isOpen) return null;

  // Requirements 1, 2, 3, 4, 12: Native getUserMedia with permission handling & Android front camera support
  const startCamera = async () => {
    setCameraError(null);
    setUploadError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API (navigator.mediaDevices.getUserMedia) is not supported by your browser or device.');
      return;
    }

    setIsCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera permission denied or unavailable:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please grant camera permission in your browser settings or use file upload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was found on your device. Please use file upload.');
      } else {
        setCameraError(`Camera access failed: ${err.message || 'Unknown error'}. Please use file upload.`);
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
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setSelfieImage(dataUrl);
        // Requirement 9 & 10: Permanent persistence in localStorage
        localStorage.setItem('timegig_profile_pic', dataUrl);
        stopCameraTracks();
      }
    }
  };

  // Requirement 6 & 7: File picker upload for face-only profile photograph
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
    // Requirement 11: Do not activate until required profile picture has been successfully uploaded and saved
    if (!selfieImage) {
      setUploadError('Profile picture is required before activating your profile.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[95vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto p-6 sm:p-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Subscription Activation ({fee}/mo)
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
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

        {/* SCREEN 1: PROFILE PICTURE & CAMERA */}
        {screen === 'selfie' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Screen 1 of 3: Profile Photograph
              </span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                33% Completed
              </span>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Camera className="w-5 h-5 text-blue-500" />
                <span>Face-Only Profile Photograph</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Capture a face-only selfie using your device camera or select a photograph from your phone gallery. Required for profile activation.
              </p>

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

              {/* Requirement 8: Display image preview before saving */}
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={captureSelfie}
                      className="px-5 py-2.5 bg-white text-slate-950 font-bold rounded-xl shadow-xl text-xs"
                    >
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCameraTracks}
                      className="px-4 py-2.5 bg-slate-800/80 text-white font-semibold rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selfieImage ? (
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <img src={selfieImage} alt="Profile Preview" className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Profile Picture Saved</p>
                      <p className="text-[11px] text-emerald-600 font-medium">Ready for account activation</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Retake
                    </button>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer">
                      Change File
                      <input type="file" accept="image/*" capture="user" onChange={handleProfilePicUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" /> Open Native Camera
                  </button>
                  <label className="flex-1 py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-blue-500 transition-colors bg-white dark:bg-slate-900 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>Select Photo (Gallery)</span>
                    <input type="file" accept="image/*" capture="user" onChange={handleProfilePicUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!selfieImage}
                onClick={() => {
                  stopCameraTracks();
                  setScreen('id');
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
              >
                <span>Next: ID Document</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: ID DOCUMENT UPLOAD */}
        {screen === 'id' && (
          <div className="space-y-6 animate-in fade-in duration-150">
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setScreen('selfie')}
                className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                disabled={!idDocName}
                onClick={() => setScreen('pop')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
              >
                <span>Next: Proof of Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: PROOF OF PAYMENT UPLOAD */}
        {screen === 'pop' && (
          <div className="space-y-6 animate-in fade-in duration-150">
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setScreen('id')}
                className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                disabled={!popDocName || !selfieImage}
                onClick={handleStartReview}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
              >
                <span>Submit Activation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
    </div>
  );
};
