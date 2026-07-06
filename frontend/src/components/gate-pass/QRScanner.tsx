import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import '../styles/qr-scanner.css';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onClose,
  placeholder = 'Scan product barcode or QR code',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [torchActive, setTorchActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsScanning(true);
          scanQRCode();
        }
      } catch (err: any) {
        setError(err.message || 'Cannot access camera');
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Scan QR code
  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isScanning) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 2,
    });

    if (code) {
      onScan(code.data);
      stopScanning();
    } else {
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if ('torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: !torchActive }],
        } as any);
        setTorchActive(!torchActive);
      }
    } catch (err) {
      setError('Torch not available');
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput);
      setManualInput('');
    }
  };

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        {/* Header */}
        <div className="qr-header">
          <h2>Scan Product</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="qr-error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Camera View */}
        {!error && (
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="camera-feed"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="scan-area">
              <div className="scan-box"></div>
              <p className="scan-hint">Position barcode in frame</p>
            </div>

            {/* Torch Button */}
            <button
              className={`torch-btn ${torchActive ? 'active' : ''}`}
              onClick={toggleTorch}
              title="Flash light"
            >
              💡
            </button>
          </div>
        )}

        {/* Manual Entry */}
        <div className="manual-entry">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
            placeholder={placeholder}
            className="manual-input"
            autoFocus
          />
          <button
            className="manual-btn"
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
          >
            ✓
          </button>
        </div>

        {/* Instructions */}
        <div className="scanner-instructions">
          <p>📱 Point camera at barcode or QR code</p>
          <p>📝 Or enter code manually below</p>
        </div>
      </div>
    </div>
  );
};
