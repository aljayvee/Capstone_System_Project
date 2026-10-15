import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Smartphone,
  UploadCloud,
  Check,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Save,
  HardDrive,
  Cpu,
  Layers,
  FileText,
  ShoppingBag,
  Bike,
  Sparkles,
  Wrench,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import type {
  AppReleaseTarget,
  AppReleaseInfo,
  AppReleasesResponse,
} from "../../../../types/sysAdmin";

interface AppFormState {
  version: string;
  minAndroid: string;
  fileSize: string;
  whatsNew: string[];
  features: string[];
  fixes: string[];
  logs: string[];
}

export const AppReleasesTab: React.FC = () => {
  const [releases, setReleases] = useState<{
    customer: AppReleaseInfo;
    rider: AppReleaseInfo;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active app view: 'customer' (Sugo Express) or 'rider' (Sugo Rider)
  const [activeTarget, setActiveTarget] = useState<AppReleaseTarget>("customer");

  // Form edit states
  const [forms, setForms] = useState<Record<AppReleaseTarget, AppFormState>>({
    customer: { version: "", minAndroid: "", fileSize: "", whatsNew: [], features: [], fixes: [], logs: [] },
    rider: { version: "", minAndroid: "", fileSize: "", whatsNew: [], features: [], fixes: [], logs: [] },
  });
  const [isSaving, setIsSaving] = useState(false);

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalUploadBytes, setTotalUploadBytes] = useState(0);
  const [uploadStage, setUploadStage] = useState<"uploading" | "assembling" | "completed">("uploading");
  const [chunkInfo, setChunkInfo] = useState<{ current: number; total: number; chunkProgress: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch release inventory
  const fetchReleases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: AppReleasesResponse = await sysAdminApiService.getAppReleases();
      if (data?.releases) {
        setReleases(data.releases);
        setForms({
          customer: {
            version: data.releases.customer.version || "1.0.0",
            minAndroid: data.releases.customer.minAndroid || "Android 8.0+",
            fileSize: data.releases.customer.fileSize || "125 MB",
            whatsNew: [...(data.releases.customer.whatsNew || [])],
            features: [
              ...(data.releases.customer.features ||
                data.releases.customer.whatsNew ||
                []),
            ],
            fixes: [...(data.releases.customer.fixes || [])],
            logs: [...(data.releases.customer.logs || [])],
          },
          rider: {
            version: data.releases.rider.version || "1.0.0",
            minAndroid: data.releases.rider.minAndroid || "Android 8.0+",
            fileSize: data.releases.rider.fileSize || "173 MB",
            whatsNew: [...(data.releases.rider.whatsNew || [])],
            features: [
              ...(data.releases.rider.features ||
                data.releases.rider.whatsNew ||
                []),
            ],
            fixes: [...(data.releases.rider.fixes || [])],
            logs: [...(data.releases.rider.logs || [])],
          },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load app release metadata.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  // Handle switching target tab
  const handleSelectTarget = (target: AppReleaseTarget) => {
    setActiveTarget(target);
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalUploadBytes(0);
    setUploadStage("uploading");
    setChunkInfo(null);
    setUploadError(null);
    setSuccessMessage(null);
  };

  // Form field update
  const handleFieldChange = (field: keyof AppFormState, value: string) => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        [field]: value,
      },
    }));
  };

  // Features item operations
  const handleAddFeature = () => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        features: [...prev[activeTarget].features, ""],
      },
    }));
  };

  const handleUpdateFeature = (index: number, text: string) => {
    setForms((prev) => {
      const nextList = [...prev[activeTarget].features];
      nextList[index] = text;
      return {
        ...prev,
        [activeTarget]: { ...prev[activeTarget], features: nextList },
      };
    });
  };

  const handleRemoveFeature = (index: number) => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        features: prev[activeTarget].features.filter((_, i) => i !== index),
      },
    }));
  };

  // Fixes item operations
  const handleAddFix = () => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        fixes: [...prev[activeTarget].fixes, ""],
      },
    }));
  };

  const handleUpdateFix = (index: number, text: string) => {
    setForms((prev) => {
      const nextList = [...prev[activeTarget].fixes];
      nextList[index] = text;
      return {
        ...prev,
        [activeTarget]: { ...prev[activeTarget], fixes: nextList },
      };
    });
  };

  const handleRemoveFix = (index: number) => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        fixes: prev[activeTarget].fixes.filter((_, i) => i !== index),
      },
    }));
  };

  // Logs item operations
  const handleAddLog = () => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        logs: [...prev[activeTarget].logs, ""],
      },
    }));
  };

  const handleUpdateLog = (index: number, text: string) => {
    setForms((prev) => {
      const nextList = [...prev[activeTarget].logs];
      nextList[index] = text;
      return {
        ...prev,
        [activeTarget]: { ...prev[activeTarget], logs: nextList },
      };
    });
  };

  const handleRemoveLog = (index: number) => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        logs: prev[activeTarget].logs.filter((_, i) => i !== index),
      },
    }));
  };

  // "What's New" item operations
  const handleAddWhatsNew = () => {
    setForms((prev) => ({
      ...prev,
      [activeTarget]: {
        ...prev[activeTarget],
        whatsNew: [...prev[activeTarget].whatsNew, ""],
      },
    }));
  };

  const handleUpdateWhatsNew = (index: number, text: string) => {
    setForms((prev) => {
      const nextList = [...prev[activeTarget].whatsNew];
      nextList[index] = text;
      return {
        ...prev,
        [activeTarget]: {
          ...prev[activeTarget],
          whatsNew: nextList,
        },
      };
    });
  };

  const handleRemoveWhatsNew = (index: number) => {
    setForms((prev) => {
      const nextList = prev[activeTarget].whatsNew.filter((_, i) => i !== index);
      return {
        ...prev,
        [activeTarget]: {
          ...prev[activeTarget],
          whatsNew: nextList,
        },
      };
    });
  };

  // Save release metadata
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const currentForm = forms[activeTarget];
    try {
      const cleanFeatures = currentForm.features.filter((item) => item.trim().length > 0);
      const cleanFixes = currentForm.fixes.filter((item) => item.trim().length > 0);
      const cleanLogs = currentForm.logs.filter((item) => item.trim().length > 0);
      const cleanWhatsNew = currentForm.whatsNew.filter((item) => item.trim().length > 0);

      const res = await sysAdminApiService.updateAppRelease(activeTarget, {
        version: currentForm.version,
        minAndroid: currentForm.minAndroid,
        fileSize: currentForm.fileSize,
        features: cleanFeatures,
        fixes: cleanFixes,
        logs: cleanLogs,
        whatsNew: cleanWhatsNew.length > 0 ? cleanWhatsNew : [...cleanFeatures, ...cleanFixes.map(f => `Fix: ${f}`)],
      });

      if (res?.release) {
        setReleases((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [activeTarget]: res.release,
          };
        });
        setSuccessMessage(`Release details for ${res.release.appName} updated successfully.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update release details.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".apk")) {
      setUploadError("Invalid file type: Please select a file with an .apk extension.");
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalUploadBytes(file.size);
    setUploadStage("uploading");
    setChunkInfo(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".apk")) {
      setUploadError("Invalid file type: Please drop a file with an .apk extension.");
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalUploadBytes(file.size);
    setUploadStage("uploading");
    setChunkInfo(null);
  };

  // Execute APK chunked upload
  const handleUploadApk = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalUploadBytes(selectedFile.size);
    setUploadStage("uploading");
    setChunkInfo(null);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      const targetVersion = forms[activeTarget].version || undefined;
      const res = await sysAdminApiService.uploadAppReleaseApkChunked(
        activeTarget,
        selectedFile,
        targetVersion,
        (progress) => {
          setUploadProgress(progress.overallPercent);
          setUploadedBytes(progress.uploadedBytes);
          setTotalUploadBytes(progress.totalBytes);
          setUploadStage(progress.stage);
          setChunkInfo({
            current: progress.currentChunk,
            total: progress.totalChunks,
            chunkProgress: progress.chunkProgressPercent,
          });
        }
      );

      if (res?.release) {
        setReleases((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [activeTarget]: res.release,
          };
        });
        setForms((prev) => ({
          ...prev,
          [activeTarget]: {
            ...prev[activeTarget],
            fileSize: res.release.fileSize,
            version: res.release.version,
          },
        }));
        setSelectedFile(null);
        setChunkInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSuccessMessage(`New APK for ${res.release.appName} uploaded and deployed successfully.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload APK file.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const activeRelease = releases ? releases[activeTarget] : null;
  const activeForm = forms[activeTarget];

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0F1A30] border border-slate-800 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-red-500 mx-auto" />
        <p className="text-xs text-slate-400">Loading app release inventory and build statuses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target App Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectTarget("customer")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
              activeTarget === "customer"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Sugo Express (Customer App)</span>
            {releases && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 font-medium">
                v{releases.customer.version}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSelectTarget("rider")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 ${
              activeTarget === "rider"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Sugo Rider (Courier App)</span>
            {releases && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 font-medium">
                v{releases.rider.version}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReleases}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
          <a
            href="https://sugoonthego.online#download-apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Landing Page</span>
          </a>
        </div>
      </div>

      {/* Global Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2.5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* App Inventory Header Card */}
      {activeRelease && (
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-red-500 shrink-0">
              {activeTarget === "customer" ? <ShoppingBag className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{activeRelease.appName}</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 font-semibold">
                  v{activeRelease.version}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  Live on Landing Page
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target package: <span className="font-mono text-slate-300">{activeRelease.packageName}</span> | File:{" "}
                <span className="font-mono text-slate-300">{activeRelease.fileName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span>
                Size: <strong className="font-mono text-white">{activeRelease.fileSize}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span>
                Min OS: <strong className="text-white">{activeRelease.minAndroid}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>
                Updated:{" "}
                <strong className="text-white">
                  {new Date(activeRelease.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </span>
            </div>
            <a
              href={`https://sugoonthego.online${activeRelease.downloadUrl}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Test Download</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Grid: Upload APK Area (Left) & Edit Details / What's New (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: APK File Upload Box */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <UploadCloud className="w-4 h-4 text-red-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Upload New APK Package
            </h4>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Upload the latest compiled release build for{" "}
            <strong className="text-slate-200">{activeRelease?.appName}</strong>. Once uploaded, the file is deployed
            directly to the server and made immediately available for download on{" "}
            <span className="font-mono text-slate-300">sugoonthego.online</span>.
          </p>

          {/* Drag & Drop Box */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? "border-emerald-500/50 bg-emerald-950/10"
                : "border-slate-700/80 hover:border-red-500/50 hover:bg-slate-800/40 bg-slate-900/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <UploadCloud className={`w-6 h-6 ${selectedFile ? "text-emerald-400" : "text-slate-400"}`} />
            </div>
            {selectedFile ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-emerald-300 break-all">{selectedFile.name}</p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-300 font-mono">
                  <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-red-400 font-sans font-medium">
                    {Math.ceil(selectedFile.size / (5 * 1024 * 1024))} chunk parts (5 MB slices)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Click to select a different APK</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">
                  Drop .apk package here or click to browse
                </p>
                <p className="text-[11px] text-slate-500">
                  Accepts signed Android packages (.apk) up to 300 MB • Uploaded chunk-by-chunk (5 MB slices)
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-[11px] text-red-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Progress Bar when uploading */}
          {isUploading && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">
                  {uploadStage === "assembling"
                    ? "Assembling chunks & validating APK signature..."
                    : chunkInfo
                    ? `Uploading chunk ${chunkInfo.current} of ${chunkInfo.total}...`
                    : "Uploading package..."}
                </span>
                <span className="font-mono text-red-400 font-semibold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {totalUploadBytes > 0 && (
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>
                    {(uploadedBytes / (1024 * 1024)).toFixed(1)} MB transferred
                    {chunkInfo && ` (Part ${chunkInfo.current}/${chunkInfo.total})`}
                  </span>
                  <span>{(totalUploadBytes / (1024 * 1024)).toFixed(1)} MB total</span>
                </div>
              )}
            </div>
          )}

          {/* Action CTA */}
          <button
            type="button"
            onClick={handleUploadApk}
            disabled={!selectedFile || isUploading}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              selectedFile && !isUploading
                ? "bg-red-600 hover:bg-red-500 text-white shadow-sm cursor-pointer active:scale-[0.99]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>
                  {uploadStage === "assembling"
                    ? "Assembling & Deploying..."
                    : chunkInfo
                    ? `Uploading Part ${chunkInfo.current}/${chunkInfo.total} (${uploadProgress}%)...`
                    : `Uploading APK (${uploadProgress}%)...`}
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload & Deploy APK (Chunked)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Editable Release Details & What's New */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Edit Release Details & What's New
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Reflects live on <strong className="text-slate-300">sugoonthego.online</strong>
            </span>
          </div>

          <form onSubmit={handleSaveDetails} className="space-y-4">
            {/* Version & System Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Version Number
                </label>
                <input
                  type="text"
                  value={activeForm.version}
                  onChange={(e) => handleFieldChange("version", e.target.value)}
                  placeholder="e.g. 1.0.1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Requires (Min OS)
                </label>
                <input
                  type="text"
                  value={activeForm.minAndroid}
                  onChange={(e) => handleFieldChange("minAndroid", e.target.value)}
                  placeholder="e.g. Android 8.0+"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Display Size
                </label>
                <input
                  type="text"
                  value={activeForm.fileSize}
                  onChange={(e) => handleFieldChange("fileSize", e.target.value)}
                  placeholder="e.g. 125 MB"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>
            </div>

            {/* 1. Features Added List Editor */}
            <div className="space-y-2.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Features Added</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    {activeForm.features.length}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-red-400" />
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeForm.features.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 w-5 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                      placeholder="e.g. Real-time multi-stop errand route tracking on map..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="Remove feature"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {activeForm.features.length === 0 && (
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No new features listed. Click "+ Add Feature" above.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Bug Fixes List Editor */}
            <div className="space-y-2.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-400" />
                  <span>Bug Fixes & Stability</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    {activeForm.fixes.length}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleAddFix}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-red-400" />
                  <span>Add Fix</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeForm.fixes.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 w-5 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateFix(idx, e.target.value)}
                      placeholder="e.g. Fixed receipt image orientation glitch on Android 14..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFix(idx)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="Remove fix"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {activeForm.fixes.length === 0 && (
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No bug fixes listed. Click "+ Add Fix" above.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Detailed Logs & Improvements List Editor */}
            <div className="space-y-2.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Release Logs & Improvements</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {activeForm.logs.length}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleAddLog}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-red-400" />
                  <span>Add Log</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeForm.logs.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 w-5 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateLog(idx, e.target.value)}
                      placeholder="e.g. Upgraded Expo SDK 57 runtime and reduced cold start latency..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLog(idx)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="Remove log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {activeForm.logs.length === 0 && (
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No system logs listed. Click "+ Add Log" above.
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Release Details...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Release Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Landing Page Preview Simulation */}
      <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Live Preview: How it Appears on sugoonthego.online
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Previewing: {activeRelease?.appName}
          </span>
        </div>

        {/* Mock Landing Card Surface */}
        <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#FAFAF9] text-slate-900 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0">
              {activeTarget === "customer" ? <ShoppingBag className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-red-600 uppercase">
                {activeTarget === "customer" ? "Customer Application" : "Delivery Partner Application"}
              </span>
              <h3 className="text-xl font-extrabold text-slate-950 tracking-tight leading-tight">
                {activeRelease?.appName}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Version <strong className="font-mono text-slate-800 tabular-nums">{activeForm.version || "1.0.0"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Size <strong className="font-mono text-slate-800 tabular-nums">{activeForm.fileSize || "125 MB"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Requires <strong className="text-slate-800">{activeForm.minAndroid || "Android 8.0+"}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
              What's New in this Version
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {activeForm.whatsNew.filter(Boolean).map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2">
            <div className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#DC2626] text-white font-bold rounded-xl text-xs sm:text-sm">
              <Download className="w-4 h-4" />
              <span>Download {activeRelease?.appName} APK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
