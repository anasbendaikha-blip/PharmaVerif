import { useCallback, useState } from 'react';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { Button } from './ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
}

export function FileUpload({
  onFileSelect,
  onFilesSelect,
  multiple = false,
  accept = '.pdf,.xlsx,.csv',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (multiple && files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files]);
        onFilesSelect?.(files);
      } else if (files.length > 0) {
        setSelectedFile(files[0]);
        onFileSelect(files[0]);
      }
    },
    [onFileSelect, onFilesSelect, multiple]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (multiple) {
        const fileArray = Array.from(files);
        setSelectedFiles((prev) => [...prev, ...fileArray]);
        onFilesSelect?.(fileArray);
      } else {
        setSelectedFile(files[0]);
        onFileSelect(files[0]);
      }
      // Reset input to allow re-selecting same files
      e.target.value = '';
    },
    [onFileSelect, onFilesSelect, multiple]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleRemoveMultiFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const inputId = multiple ? 'file-upload-multi' : 'file-upload';

  // Multi-file mode
  if (multiple) {
    return (
      <div className="w-full space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
          `}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            id={inputId}
            multiple
          />
          <label htmlFor={inputId} className="cursor-pointer">
            <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-sm mb-1">
              <span className="text-blue-600 font-medium">Cliquez pour parcourir</span> ou
              glissez-déposez plusieurs fichiers
            </p>
            <p className="text-xs text-gray-500">Excel (.xlsx, .xls) ou CSV</p>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné
              {selectedFiles.length > 1 ? 's' : ''}
            </p>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveMultiFile(index)}
                  className="text-gray-400 hover:text-red-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single file mode (original behavior)
  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
          `}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            id={inputId}
          />
          <label htmlFor={inputId} className="cursor-pointer">
            <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-lg mb-2">
              <span className="text-blue-600 font-medium">Cliquez pour parcourir</span> ou
              glissez-déposez
            </p>
            <p className="text-sm text-gray-500 mb-2">Excel (.xlsx, .xls) ou CSV (max. 10MB)</p>
            <p className="text-xs text-gray-400">Parsing réel des fichiers Excel/CSV</p>
          </label>
        </div>
      ) : (
        <div className="border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <FileIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="text-gray-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
