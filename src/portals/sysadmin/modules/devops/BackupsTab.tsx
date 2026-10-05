import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  FileArchive,
  Calendar,
  HardDrive,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import type { DatabaseBackupRecord } from "../../../../types/sysAdmin";
import { MobileResponsiveTable } from "../../../../components/table";

export const BackupsTab: React.FC = () => {
  const [backups, setBackups] = useState<DatabaseBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Manual trigger modal state
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggerPassword, setTriggerPassword] = useState("");
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // Delete modal state
  const [backupToDelete, setBackupToDelete] = useState<DatabaseBackupRecord | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Downloading indicator
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sysAdminApiService.getBackups();
      setBackups(data.backups || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load database backups.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleTriggerBackup = async () => {
    setIsCreatingBackup(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await sysAdminApiService.triggerBackup(triggerPassword || undefined);
      setActionSuccess(
        `Database backup created successfully: ${res.backupFile} (${res.backupSizeFormatted})`
      );
      setIsTriggerModalOpen(false);
      setTriggerPassword("");
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate database backup.";
      setError(msg);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownload = async (backup: DatabaseBackupRecord) => {
    setDownloadingId(backup.id);
    setError(null);
    try {
      await sysAdminApiService.downloadBackup(backup.id, backup.fileName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download backup.";
      setError(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!backupToDelete) return;
    setIsDeleting(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await sysAdminApiService.deleteBackup(backupToDelete.id, deletePassword || undefined);
      setActionSuccess(`Backup ${res.fileName} deleted successfully.`);
      setBackupToDelete(null);
      setDeletePassword("");
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete backup.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Retention Policy Banner */}
      <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <FileArchive className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Automated Gzip Database Backup Engine
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nightly compressed snapshots (<code className="text-sky-300 font-mono">.sql.gz</code>) execute automatically at 02:00 AM Manila Time (18:00 UTC). Backups older than 7 days are automatically pruned to preserve server storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={fetchBackups}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[#0B132B] hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh Backups List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-red-400" : ""}`} />
          </button>
          <button
            onClick={() => setIsTriggerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-xs text-white transition-colors flex items-center gap-2"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Create Snapshot</span>
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-slate-400 hover:text-white underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-white underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Backups Inventory Table */}
      {(() => {
        const filteredBackups = backups.filter(
          (b) =>
            b.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const desktopTable = (
          <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <span>Snapshot Inventory &amp; Export Stream ({backups.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Storage destination: /var/www/server/backups/
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Created By</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-red-400" />
                        Loading database backup inventory...
                      </td>
                    </tr>
                  ) : filteredBackups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                        No database snapshots found. Click &quot;Create Snapshot&quot; to generate an on-demand backup.
                      </td>
                    </tr>
                  ) : (
                    filteredBackups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-white flex items-center gap-2">
                          <FileArchive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{b.fileName}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300 tabular-nums">
                          {b.fileSizeFormatted}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                              b.backupType === "AUTOMATED"
                                ? "bg-purple-950/60 text-purple-300 border-purple-800/60"
                                : "bg-sky-950/60 text-sky-300 border-sky-800/60"
                            }`}
                          >
                            {b.backupType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                              b.status === "SUCCESS"
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                                : "bg-rose-950/60 text-rose-400 border-rose-800/60"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {b.createdBy}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleDownload(b)}
                              disabled={downloadingId === b.id}
                              className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-[11px] font-medium transition-colors flex items-center gap-1.5"
                              title="Download compressed snapshot"
                            >
                              <Download className={`w-3 h-3 ${downloadingId === b.id ? "animate-spin" : ""}`} />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => setBackupToDelete(b)}
                              className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <MobileResponsiveTable<DatabaseBackupRecord>
            data={filteredBackups}
            keyExtractor={(b) => b.id}
            isLoading={isLoading}
            desktopView={desktopTable}
            primaryHeader="Snapshot Archive"
            secondaryHeader="Size & Status"
            renderPrimary={(b) => (
              <div className="flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono font-medium text-white text-xs truncate">
                    {b.fileName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {b.backupType} · {b.createdBy}
                  </div>
                </div>
              </div>
            )}
            renderSecondary={(b) => (
              <div className="text-right">
                <div className="font-mono text-xs text-slate-200 tabular-nums">
                  {b.fileSizeFormatted}
                </div>
                <span
                  className={`inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                    b.status === "SUCCESS"
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                      : "bg-rose-950/60 text-rose-400 border-rose-800/60"
                  }`}
                >
                  {b.status}
                </span>
              </div>
            )}
            renderPreview={(b) => (
              <div className="space-y-1.5 pt-1 text-slate-300">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Created By:</span>
                  <span className="font-mono text-slate-200">{b.createdBy}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Type / Engine:</span>
                  <span className="font-mono text-sky-400">{b.backupType} (Gzip .sql.gz)</span>
                </div>
              </div>
            )}
            renderRowActions={(b) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(b)}
                  disabled={downloadingId === b.id}
                  className="flex-1 py-2 px-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-all"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === b.id ? "animate-spin" : ""}`} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBackupToDelete(b)}
                  className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-center min-h-[44px] min-w-[44px] active:scale-95 transition-all"
                  title="Delete snapshot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            inspectorTitle={(b) => b.fileName}
            inspectorSubtitle={(b) => `Database Backup Snapshot (${b.backupType})`}
            inspectorStatusBadge={(b) => (
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  b.status === "SUCCESS"
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                    : "bg-rose-950/60 text-rose-400 border-rose-800/60"
                }`}
              >
                {b.status}
              </span>
            )}
            inspectorSections={(b) => [
              {
                title: "Snapshot Details",
                items: [
                  { label: "File Name", value: b.fileName, copyable: true, copyValue: b.fileName, fullWidth: true },
                  { label: "File Size", value: b.fileSizeFormatted },
                  { label: "Backup Type", value: b.backupType },
                  { label: "Status", value: b.status },
                  { label: "Created By", value: b.createdBy },
                  { label: "Creation Timestamp", value: new Date(b.createdAt).toLocaleString(), fullWidth: true },
                  { label: "Storage Path", value: `/var/www/server/backups/${b.fileName}`, fullWidth: true },
                ],
              },
            ]}
            inspectorActions={(b, onClose) => (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleDownload(b)}
                  disabled={downloadingId === b.id}
                  className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs min-h-[48px] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Download className={`w-4 h-4 ${downloadingId === b.id ? "animate-spin" : ""}`} />
                  <span>Download Gzip Archive ({b.fileSizeFormatted})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setBackupToDelete(b);
                  }}
                  className="w-full py-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs min-h-[48px] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Snapshot</span>
                </button>
              </div>
            )}
            searchPlaceholder="Search snapshots by name or author..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        );
      })()}

      {/* Trigger Modal */}
      {isTriggerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1A30] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Database className="w-4 h-4 text-sky-400" />
                <span>Generate Database Backup Snapshot</span>
              </div>
              <button
                onClick={() => setIsTriggerModalOpen(false)}
                disabled={isCreatingBackup}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                An on-demand compressed SQL dump (<code className="font-mono text-sky-300">.sql.gz</code>) of the entire <span className="font-bold text-white">errand_system_db</span> database will be generated on the VPS disk.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-medium text-slate-400">
                  Step-Up Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={triggerPassword}
                    onChange={(e) => setTriggerPassword(e.target.value)}
                    placeholder="Enter password..."
                    disabled={isCreatingBackup}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(false)}
                disabled={isCreatingBackup}
                className="px-3.5 py-1.5 rounded-lg bg-[#070D1B] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={isCreatingBackup || !triggerPassword}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center gap-2"
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dumping &amp; Compressing...</span>
                  </>
                ) : (
                  <span>Create Snapshot</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {backupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1A30] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Delete Database Snapshot</span>
              </div>
              <button
                onClick={() => setBackupToDelete(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Are you sure you want to permanently delete snapshot{" "}
                <span className="font-mono font-bold text-white">{backupToDelete.fileName}</span>?
              </p>
              <p className="text-rose-400 text-[11px]">
                This will unlink the file from disk and remove its database metadata record.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-medium text-slate-400">
                  Confirm with Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter password..."
                    disabled={isDeleting}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBackupToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-[#070D1B] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || !deletePassword}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete File</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
