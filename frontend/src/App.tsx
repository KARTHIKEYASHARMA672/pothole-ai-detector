import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  UploadCloud,
  FileImage,
  RefreshCw,
  Zap,
  Sliders,
  Eye,
  Layers,
  ShieldCheck,
  Cpu,
  Download,
  AlertCircle
} from 'lucide-react';
import type { DetectionResponse, BackendHealth } from './types';

export const App: React.FC = () => {
  // State Management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [results, setResults] = useState<DetectionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [viewMode, setViewMode] = useState<'annotated' | 'original'>('annotated');
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [customApiUrl, setCustomApiUrl] = useState<string>(() => {
    return localStorage.getItem('pothole_api_url') || import.meta.env.VITE_API_URL || '';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeApiUrl = customApiUrl.trim().replace(/\/$/, '');

  // Check Backend Health & Model Load Status
  const checkHealth = async () => {
    try {
      const endpoint = activeApiUrl ? `${activeApiUrl}/api/health` : '/api/health';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data: BackendHealth = await res.json();
        setBackendHealth(data);
      } else {
        setBackendHealth(null);
      }
    } catch {
      setBackendHealth(null);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, [activeApiUrl]);

  const updateApiUrl = (url: string) => {
    setCustomApiUrl(url);
    localStorage.setItem('pothole_api_url', url);
  };

  // Handle Image Selection
  const handleFileChange = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      setErrorMessage('Please upload a valid image file (.jpg, .jpeg, .png, .webp)');
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    setResults(null);
    setViewMode('annotated');

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Trigger Detection with Backend API
  const handleDetectPotholes = async () => {
    if (!selectedFile) return;

    setIsDetecting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const endpoint = activeApiUrl
        ? `${activeApiUrl}/api/detect?confidence_threshold=${confThreshold}`
        : `/api/detect?confidence_threshold=${confThreshold}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Inference error: HTTP ${response.status}`);
      }

      const data: DetectionResponse = await response.json();
      setResults(data);
      setViewMode(data.detected && data.annotated_image ? 'annotated' : 'original');
    } catch (err: any) {
      console.error('Detection request failed:', err);
      setErrorMessage(
        err.message || 'Failed to connect to the backend detection server. Make sure FastAPI is running on port 8000.'
      );
    } finally {
      setIsDetecting(false);
    }
  };

  // Reset to Upload Another Image
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sample Images Loader for instant demo testing
  const loadSampleImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
      handleFileChange(file);
    } catch {
      setErrorMessage('Could not load sample image.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#111827]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30">
              <span className="text-xl">🕳️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Pothole AI Detector
              </h1>
              <p className="text-xs text-slate-400 font-mono">Ultralytics YOLO Vision</p>
            </div>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center space-x-3">
            {/* Sensitivity Toggle Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Detection Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sensitivity: {Math.round(confThreshold * 100)}%</span>
            </button>

            {/* Backend Health Badge */}
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                backendHealth?.status === 'online'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                  : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth?.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="hidden sm:inline">
                {backendHealth?.status === 'online'
                  ? backendHealth.model_loaded
                    ? 'YOLO Model Ready'
                    : 'Backend Online (Model Ready)'
                  : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Sensitivity Settings Drawer */}
        {showSettings && (
          <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-4 shadow-xl">
            <div className="max-w-7xl mx-auto flex flex-col gap-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold">Backend API Endpoint:</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="e.g. http://localhost:8000 or https://..."
                    value={customApiUrl}
                    onChange={(e) => updateApiUrl(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono w-full sm:w-80 focus:outline-none focus:border-indigo-500"
                  />
                  {customApiUrl && (
                    <button
                      onClick={() => updateApiUrl('')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Confidence Sensitivity (Threshold):</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-72">
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={confThreshold}
                    onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-mono text-indigo-400 font-bold min-w-[3rem]">
                    {Math.round(confThreshold * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Hero Section */}
        <section className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automated Road Safety Inspection</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Pothole AI Detector
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            Upload a road image and let AI detect potholes in real-time with precise bounding boxes and confidence metrics.
          </p>
        </section>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block">Notice:</strong>
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Controls */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Upload Box */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-indigo-400" />
                <span>Upload Road Image</span>
              </h3>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                    : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/40 bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <p className="text-sm font-semibold text-slate-200 mb-1">
                  Drag and drop road image here
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Supports JPG, JPEG, PNG, or WEBP
                </p>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all pointer-events-none"
                >
                  Browse Image
                </button>
              </div>

              {/* Sample Images Palette */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-400 mb-2.5 font-medium">Or test with road samples:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      loadSampleImage(
                        'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
                        'road_pothole_sample.jpg'
                      )
                    }
                    className="px-3 py-2 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>🕳️ Damaged Asphalt</span>
                  </button>
                  <button
                    onClick={() =>
                      loadSampleImage(
                        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
                        'clean_road_sample.jpg'
                      )
                    }
                    className="px-3 py-2 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>🛣️ Clean Road</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Bar when an image is selected */}
            {selectedFile && (
              <div className="bg-[#111827] rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span className="truncate max-w-[200px] font-mono text-slate-200">
                    {selectedFile.name}
                  </span>
                  <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDetectPotholes}
                    disabled={isDetecting}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isDetecting
                        ? 'bg-indigo-600/50 text-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01]'
                    }`}
                  >
                    {isDetecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Running YOLO Inference...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>Detect Pothole</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="Upload another image"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visualizer & Detection Results */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Detection Display Card */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 p-6 shadow-xl">
              {/* Header with Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>Computer Vision Inspection View</span>
                </h3>

                {results && (
                  <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
                    <button
                      onClick={() => setViewMode('annotated')}
                      disabled={!results.annotated_image}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        viewMode === 'annotated' && results.annotated_image
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      Annotated YOLO
                    </button>
                    <button
                      onClick={() => setViewMode('original')}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        viewMode === 'original'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Original Image
                    </button>
                  </div>
                )}
              </div>

              {/* Visual Canvas View */}
              <div className="relative rounded-xl overflow-hidden bg-black/60 border border-slate-800 min-h-[340px] flex items-center justify-center">
                {previewUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={
                        viewMode === 'annotated' && results?.annotated_image
                          ? results.annotated_image
                          : previewUrl
                      }
                      alt="Road Preview"
                      className="max-h-[500px] w-full object-contain rounded-lg"
                    />

                    {/* Scanning Animation when Detection is running */}
                    {isDetecting && (
                      <div className="absolute inset-0 bg-indigo-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center">
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan" />
                        <div className="px-4 py-2 rounded-full bg-slate-900/90 border border-indigo-500/50 shadow-2xl flex items-center gap-2 text-xs font-semibold text-indigo-300">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing YOLO Neural Network...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                    <Layers className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">No road image loaded</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Upload an image or select a sample from the left panel to begin.
                    </p>
                  </div>
                )}
              </div>

              {/* Status Outcome Banner */}
              {results && (
                <div className="mt-6">
                  {results.detected ? (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 via-rose-900/30 to-amber-950/40 border border-rose-500/40 text-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-xl shadow-lg">
                          <span>🕳️</span>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-rose-300">
                            Pothole Detected
                          </h4>
                          <p className="text-xs text-slate-300">
                            {results.num_potholes} road hazard{results.num_potholes > 1 ? 's' : ''} identified with{' '}
                            <span className="font-semibold text-white">
                              {results.max_confidence_percentage}%
                            </span>{' '}
                            confidence.
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:block text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Requires Attention
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-teal-950/40 border border-emerald-500/40 text-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl shadow-lg">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-emerald-300">
                            No Pothole Detected
                          </h4>
                          <p className="text-xs text-slate-300">
                            The analyzed road surface is clear of detected potholes.
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:block text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Clear Road
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Cards Grid */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                        Potholes Count
                      </span>
                      <span
                        className={`text-2xl font-black ${
                          results.detected ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {results.num_potholes}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                        Confidence
                      </span>
                      <span className="text-2xl font-black text-indigo-400">
                        {results.detected ? `${results.max_confidence_percentage}%` : '0%'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                        Inference Time
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {results.inference_time_ms} <span className="text-xs font-normal">ms</span>
                      </span>
                    </div>
                  </div>

                  {/* Detailed Detections List (if multiple potholes) */}
                  {results.detections && results.detections.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                        Individual Detection Scores
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {results.detections.map((det, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 flex items-center gap-2 text-xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="font-medium text-slate-200">
                              Hazard #{idx + 1}:
                            </span>
                            <span className="font-bold text-indigo-400">
                              {det.confidence_percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Another Button */}
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Upload Another Image</span>
                    </button>

                    {results.annotated_image && (
                      <a
                        href={results.annotated_image}
                        download="pothole_detection_annotated.jpg"
                        className="px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Result</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0b0f19] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Pothole AI Detector &copy; 2026 — Ultralytics YOLO & FastAPI</span>
          <span className="font-mono text-slate-600">Model: backend/model/best_pothole_model.pt</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
