'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File as FileIcon, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { MAX_FILE_SIZE } from '@/lib/transfer-sender';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export default function FileDropzone({
  onFileSelected,
  selectedFile,
  onClear,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (fileList: FileList | File[]) => {
    setErrorMessage(null);

    if (fileList.length === 0) return;

    if (fileList.length > 1) {
      setErrorMessage('ZeroCloud transfers one file at a time. Please select exactly one file (up to 10 GB).');
      return;
    }

    const file = fileList[0];

    // Detect directories (typically size is 0 or multiple of 4096 with empty type and no extension)
    if (!file.type && file.size % 4096 === 0 && !file.name.includes('.')) {
      setErrorMessage('Folders are not supported directly. Please archive the folder into a .zip or .tar file first.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please select a file with data to transfer.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        `File is too large (${formatBytes(file.size)}). ZeroCloud supports single files up to 10 GB.`
      );
      return;
    }

    onFileSelected(file);
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

      {!selectedFile ? (
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
          aria-label="Drag and drop a file or click to browse up to 10 GB"
          className={`relative group cursor-pointer w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all flex flex-col items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            isDragging
              ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10 scale-[1.01]'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-dark-card/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            disabled={disabled}
            aria-hidden="true"
          />

          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Choose a file or drag & drop here
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            Any file type up to <span className="font-semibold text-zinc-800 dark:text-zinc-200">10 GB</span>. Direct P2P transfer with end-to-end encryption.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 group-hover:bg-brand-600 dark:group-hover:bg-brand-500 dark:group-hover:text-white transition-colors">
              Browse File
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full p-5 sm:p-6 rounded-2xl glass-card animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <FileIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedFile.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400">
                    {formatBytes(selectedFile.size)}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono truncate max-w-[180px]">
                    {selectedFile.type || 'Binary / Unspecified'}
                  </span>
                </div>
              </div>
            </div>

            {!disabled && (
              <button
                onClick={onClear}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.95] rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Remove selected file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
