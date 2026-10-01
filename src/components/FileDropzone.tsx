'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File as FileIcon, Files, AlertCircle, X, Archive } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { MAX_FILE_SIZE } from '@/lib/transfer-sender';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onClear: () => void;
  disabled?: boolean;
}

export default function FileDropzone({
  onFilesSelected,
  selectedFiles,
  onClear,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (fileList: FileList | File[]) => {
    setErrorMessage(null);

    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Filter out 0-byte or invalid system files
    const validFiles: File[] = [];
    let totalBytes = 0;

    for (const file of files) {
      if (file.size === 0) {
        setErrorMessage(`"${file.name}" is empty (0 bytes). Empty files cannot be transferred.`);
        return;
      }
      totalBytes += file.size;
      validFiles.push(file);
    }

    if (totalBytes > MAX_FILE_SIZE) {
      setErrorMessage(
        `Total size is too large (${formatBytes(totalBytes)}). ZeroCloud supports transfers up to 10 GB.`
      );
      return;
    }

    onFilesSelected(validFiles);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files);
    }
  };

  const isMultiple = selectedFiles.length > 1;
  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full">
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-sm animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Selection Error: </span>
            {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-red-500/20 rounded-md transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedFiles.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label="Drag and drop files or click to browse up to 10 GB"
          className={`relative group cursor-pointer w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all flex flex-col items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            isDragging
              ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10 scale-[1.01]'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-dark-card/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            disabled={disabled}
            aria-hidden="true"
          />

          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Choose files or drag & drop here
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            Select single or multiple files up to <span className="font-semibold text-zinc-800 dark:text-zinc-200">10 GB</span>. Direct P2P transfer with end-to-end AES-256 encryption.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 group-hover:bg-brand-600 dark:group-hover:bg-brand-500 dark:group-hover:text-white transition-colors">
              Browse Files
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              Multiple files auto-zip
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full p-5 sm:p-6 rounded-2xl glass-card animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                {isMultiple ? <Files className="w-6 h-6" /> : <FileIcon className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                  {isMultiple ? `${selectedFiles.length} files selected` : selectedFiles[0].name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400">
                    {formatBytes(totalSize)}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  {isMultiple ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium">
                      <Archive className="w-3 h-3" /> Auto-streaming ZIP bundle
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono truncate max-w-[180px]">
                      {selectedFiles[0].type || 'Binary / Unspecified'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!disabled && (
              <button
                onClick={onClear}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.95] rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Remove selected files"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {isMultiple && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 max-h-32 overflow-y-auto pr-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 space-y-1">
              {selectedFiles.slice(0, 10).map((f, i) => (
                <div key={i} className="flex justify-between truncate py-0.5">
                  <span className="truncate pr-2">{f.name}</span>
                  <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{formatBytes(f.size)}</span>
                </div>
              ))}
              {selectedFiles.length > 10 && (
                <div className="text-center italic text-[11px] pt-1 text-zinc-400">
                  + {selectedFiles.length - 10} more files
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
