import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  ImagePlus,
  RefreshCw,
  SwitchCamera,
  AlertCircle,
} from 'lucide-react';

function mapCameraErrorMessage(err) {
  const name = err?.name || '';
  if (window && window.isSecureContext === false) {
    return 'Camera scanning requires HTTPS or localhost. Use Upload QR Image or enter the Pass ID below.';
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Enable camera access in browser settings or upload a QR screenshot below.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device. You can upload a QR image or enter the Pass ID manually.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is currently in use by another app or tab. Close it and tap Retry Camera.';
  }
  return err?.message || 'Unable to start camera scanner. Upload a QR image or enter Pass ID below.';
}

/**
 * Mobile-first QR Camera Scanner built on native getUserMedia + jsQR.
 * Supports rear-camera preference, camera switching, torch toggle, image upload fallback,
 * and automatic stream cleanup on unmount or scan completion.
 */
export default function QrCameraScanner({ active = true, onScanSuccess, busy = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanLockedRef = useRef(false);

  const [cameraStatus, setCameraStatus] = useState('initializing'); // initializing | active | paused | error
  const [cameraError, setCameraError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [imageScanError, setImageScanError] = useState(null);

  const stopStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore cleanup error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startScanner = useCallback(async () => {
    stopStream();
    setCameraError(null);
    setImageScanError(null);
    scanLockedRef.current = false;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraError(mapCameraErrorMessage(new Error('Camera API unavailable in this browser.')));
      return;
    }

    setCameraStatus('initializing');

    try {
      const constraints = {
        audio: false,
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack?.getCapabilities) {
        const caps = videoTrack.getCapabilities();
        setTorchSupported(Boolean(caps?.torch));
      }

      if (navigator.mediaDevices.enumerateDevices) {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(allDevices.filter((d) => d.kind === 'videoinput'));
      }

      const videoEl = videoRef.current;
      if (!videoEl) {
        stopStream();
        return;
      }

      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');
      await videoEl.play();
      setCameraStatus('active');

      // Ensure offscreen canvas exists
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      scanIntervalRef.current = setInterval(() => {
        if (scanLockedRef.current || busy) return;
        const vid = videoRef.current;
        const canvas = canvasRef.current;
        if (!vid || !canvas || vid.readyState !== vid.HAVE_ENOUGH_DATA || !vid.videoWidth || !vid.videoHeight) {
          return;
        }

        const scale = Math.min(1, 640 / vid.videoWidth);
        const w = Math.max(1, Math.floor(vid.videoWidth * scale));
        const h = Math.max(1, Math.floor(vid.videoHeight * scale));

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(vid, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const decoded = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });

        if (decoded?.data) {
          scanLockedRef.current = true;
          stopStream();
          setCameraStatus('paused');
          onScanSuccess?.(decoded.data);
        }
      }, 160);
    } catch (err) {
      stopStream();
      setCameraStatus('error');
      setCameraError(mapCameraErrorMessage(err));
    }
  }, [selectedDeviceId, busy, onScanSuccess, stopStream]);

  useEffect(() => {
    if (active) {
      startScanner();
    } else {
      stopStream();
      setCameraStatus('paused');
    }
    return () => stopStream();
  }, [active, startScanner, stopStream]);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      // Ignore if device refuses torch constraint dynamically
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const currentIdx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % devices.length : 1;
    setSelectedDeviceId(devices[nextIdx].deviceId);
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageScanError(null);
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvasRef.current = canvas;
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.floor(img.width * scale));
        const h = Math.max(1, Math.floor(img.height * scale));
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const decoded = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });

        if (decoded?.data) {
          stopStream();
          setCameraStatus('paused');
          onScanSuccess?.(decoded.data);
        } else {
          setImageScanError('No QR code detected in that image. Try another photo or enter the Pass ID manually.');
        }
      } catch {
        setImageScanError('Unable to decode QR from the selected image.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setImageScanError('Invalid image file selected.');
    };

    img.src = objectUrl;
  };

  return (
    <section
      aria-label="QR Code Camera Scanner"
      className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-3.5 sm:p-4 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(124,58,237,0.12)] backdrop-blur-md space-y-3"
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              cameraStatus === 'active'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                : cameraStatus === 'initializing'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-xs font-semibold text-[#D6CFE6] truncate">
            {cameraStatus === 'active'
              ? 'Camera Active — Align Pass QR Inside Frame'
              : cameraStatus === 'initializing'
              ? 'Starting Camera...'
              : cameraStatus === 'paused'
              ? 'Scanner Paused'
              : 'Camera Unavailable'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {torchSupported && cameraStatus === 'active' && (
            <button
              type="button"
              onClick={handleToggleTorch}
              aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-purple-500/25 border border-white/10 flex items-center justify-center text-[#D6CFE6] hover:text-white transition cursor-pointer"
            >
              {torchOn ? <FlashlightOff className="w-4 h-4 text-amber-300" /> : <Flashlight className="w-4 h-4" />}
            </button>
          )}

          {devices.length > 1 && cameraStatus === 'active' && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              aria-label="Switch camera"
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-purple-500/25 border border-white/10 flex items-center justify-center text-[#D6CFE6] hover:text-white transition cursor-pointer"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewfinder Box */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden bg-[#090512] border border-purple-500/25 flex items-center justify-center">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Scanning Corner Frame Overlay */}
        {cameraStatus === 'active' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
              <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-[#C084FC] rounded-tl-xl shadow-[0_0_12px_rgba(192,132,252,0.8)]" />
              <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-[#C084FC] rounded-tr-xl shadow-[0_0_12px_rgba(192,132,252,0.8)]" />
              <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-[#C084FC] rounded-bl-xl shadow-[0_0_12px_rgba(192,132,252,0.8)]" />
              <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-[#C084FC] rounded-br-xl shadow-[0_0_12px_rgba(192,132,252,0.8)]" />
            </div>
          </div>
        )}

        {/* Fallback / Status Center States */}
        {cameraStatus === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center p-4">
            <Camera className="w-8 h-8 text-purple-400 animate-pulse" aria-hidden="true" />
            <p className="text-xs text-[#A9A0BC]">Requesting camera access...</p>
          </div>
        )}

        {cameraStatus === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-4">
            <CameraOff className="w-8 h-8 text-[#A9A0BC]" aria-hidden="true" />
            <p className="text-xs text-[#A9A0BC]">Camera paused</p>
            <button
              type="button"
              onClick={startScanner}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-bold text-white cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Resume Camera</span>
            </button>
          </div>
        )}

        {cameraStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-5">
            <CameraOff className="w-8 h-8 text-rose-400" aria-hidden="true" />
            <p className="text-xs text-rose-200 max-w-xs leading-relaxed">{cameraError}</p>
            <button
              type="button"
              onClick={startScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-semibold text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Scanner Quick Controls (Pause/Resume + Upload QR Image) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            if (cameraStatus === 'active') {
              stopStream();
              setCameraStatus('paused');
            } else {
              startScanner();
            }
          }}
          className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-[#D6CFE6] hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          {cameraStatus === 'active' ? (
            <>
              <CameraOff className="w-3.5 h-3.5 text-purple-300" aria-hidden="true" />
              <span>Pause Camera</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-purple-300" aria-hidden="true" />
              <span>Start Camera</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/35 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <ImagePlus className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
          <span>Upload QR Image</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileSelect}
          className="hidden"
          aria-label="Upload QR code image"
        />
      </div>

      {imageScanError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-500/15 border border-rose-500/35 px-3 py-2 flex items-start gap-2 text-[11px] text-rose-200"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{imageScanError}</span>
        </div>
      )}
    </section>
  );
}

