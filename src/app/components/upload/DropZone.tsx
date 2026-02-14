/**
 * PharmaVerif - DropZone Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Zone de drag & drop amelioree pour upload de factures :
 *  - Etats visuels : idle, hover, dragging, accepted, rejected
 *  - Validation en temps reel (format, taille)
 *  - Support multi-fichiers (jusqu'a 5 simultanes)
 *  - Bordure pointillee / solide bleue au hover
 *  - Background teinte au drag-over
 *  - Feedback immediat si fichier rejete
 */

import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Camera } from 'lucide-react';
import { cn } from '../ui/utils';

// ========================================
// TYPES
// ========================================

interface DropZoneProps {
  /** Callback fichier unique */
  onFileSelect: (file: File) => void;
  /** Callback multi-fichiers */
  onFilesSelect?: (files: File[]) => void;
  /** Mode multi-fichiers */
  multiple?: boolean;
  /** Nombre max de fichiers simultanes */
  maxFiles?: number;
  /** Taille max en bytes (defaut: 10 MB) */
  maxSize?: number;
  /** Extensions acceptees */
  accept?: string[];
  /** Desactive la zone */
  disabled?: boolean;
  /** Active la capture camera sur mobile */
  enableCamera?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
}

type DropState = 'idle' | 'drag-over' | 'rejected';

// ========================================
// CONSTANTES
// ========================================

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_ACCEPT = ['.pdf', '.xml', '.xlsx', '.xls', '.csv'];
const DEFAULT_MAX_FILES = 5;

const FORMAT_LABELS: Record<string, string> = {
  '.pdf': 'PDF',
  '.xml': 'XML',
  '.xlsx': 'Excel',
  '.xls': 'Excel',
  '.csv': 'CSV',
};

// ========================================
// COMPONENT
// ========================================

export function DropZone({
  onFileSelect,
  onFilesSelect,
  multiple = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  disabled = false,
  enableCamera = false,
  className,
}: DropZoneProps) {
  const [dropState, setDropState] = useState<DropState>('idle');
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // ---- Validation ----
  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!accept.includes(ext)) {
        return `Format non supporte : ${ext}`;
      }
      if (file.size > maxSize) {
        return `Fichier trop volumineux : ${(file.size / (1024 * 1024)).toFixed(1)} MB (max ${(maxSize / (1024 * 1024)).toFixed(0)} MB)`;
      }
      return null;
    },
    [accept, maxSize]
  );

  // ---- Drag handlers ----
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setDropState('drag-over');
        setRejectMessage(null);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setDropState('idle');
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;

      if (disabled) {
        setDropState('idle');
        return;
      }

      const droppedFiles = Array.from(e.dataTransfer.files);

      if (droppedFiles.length === 0) {
        setDropState('idle');
        return;
      }

      // Limiter le nombre de fichiers
      const filesToProcess = multiple
        ? droppedFiles.slice(0, maxFiles)
        : [droppedFiles[0]];

      // Valider chaque fichier
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of filesToProcess) {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name} : ${error}`);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0 && validFiles.length === 0) {
        setDropState('rejected');
        setRejectMessage(errors[0]);
        setTimeout(() => {
          setDropState('idle');
          setRejectMessage(null);
        }, 3000);
        return;
      }

      setDropState('idle');
      setRejectMessage(null);

      if (multiple && onFilesSelect) {
        onFilesSelect(validFiles);
      } else if (validFiles.length > 0) {
        onFileSelect(validFiles[0]);
      }
    },
    [disabled, multiple, maxFiles, validateFile, onFileSelect, onFilesSelect]
  );

  // ---- Click handler ----
  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      if (multiple && onFilesSelect) {
        const validFiles = fileArray.filter((f) => !validateFile(f));
        if (validFiles.length > 0) {
          onFilesSelect(validFiles.slice(0, maxFiles));
        }
      } else {
        const error = validateFile(fileArray[0]);
        if (!error) {
          onFileSelect(fileArray[0]);
        } else {
          setRejectMessage(error);
          setDropState('rejected');
          setTimeout(() => {
            setDropState('idle');
            setRejectMessage(null);
          }, 3000);
        }
      }

      // Reset input
      e.target.value = '';
    },
    [multiple, maxFiles, validateFile, onFileSelect, onFilesSelect]
  );

  // ---- Camera handler ----
  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      // Camera captures are images — pass directly without format validation
      onFileSelect(files[0]);
      e.target.value = '';
    },
    [onFileSelect]
  );

  // ---- Format label ----
  const formatsLabel = accept
    .map((ext) => FORMAT_LABELS[ext] || ext)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .join(', ');

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Zone de depot de fichier. Formats acceptes : ${formatsLabel}. Taille maximum : ${(maxSize / (1024 * 1024)).toFixed(0)} MB`}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',

        // Idle
        dropState === 'idle' && !disabled && 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10',

        // Drag over
        dropState === 'drag-over' && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]',

        // Rejected
        dropState === 'rejected' && 'border-red-400 bg-red-50/50 dark:bg-red-900/10',

        // Disabled
        disabled && 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700',

        className
      )}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="flex justify-center mb-4">
        {dropState === 'rejected' ? (
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        ) : dropState === 'drag-over' ? (
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        ) : (
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
            <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </div>

      {/* Text */}
      {dropState === 'rejected' && rejectMessage ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{rejectMessage}</p>
          <p className="text-xs text-red-500/70">Cliquez pour choisir un autre fichier</p>
        </div>
      ) : dropState === 'drag-over' ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Deposez votre fichier ici
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Glissez votre facture</span>{' '}
            <span className="text-muted-foreground">ou cliquez pour choisir</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Formats acceptes : {formatsLabel}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Taille max : {(maxSize / (1024 * 1024)).toFixed(0)} MB
            {multiple && ` | Max ${maxFiles} fichiers`}
          </p>
        </div>
      )}

      {/* Camera capture (mobile only) */}
      {enableCamera && !disabled && dropState === 'idle' && (
        <div className="sm:hidden mt-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Prendre une photo de la facture
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
