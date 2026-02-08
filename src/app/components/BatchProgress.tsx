/**
 * PharmaVerif - Batch Processing Progress
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export interface BatchFileStatus {
  fileName: string;
  status: 'pending' | 'parsing' | 'verifying' | 'done' | 'error';
  error?: string;
}

interface BatchProgressProps {
  files: BatchFileStatus[];
  current: number;
  total: number;
}

export function BatchProgress({ files, current, total }: BatchProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Traitement en cours...</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {current}/{total} fichiers
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* File list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              {file.status === 'done' && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {file.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              {(file.status === 'parsing' || file.status === 'verifying') && (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
              )}
              {file.status === 'pending' && (
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.fileName}
                </p>
                {file.status === 'parsing' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">Parsing...</p>
                )}
                {file.status === 'verifying' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">Vérification...</p>
                )}
                {file.status === 'error' && (
                  <p className="text-xs text-red-600 dark:text-red-400">{file.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
