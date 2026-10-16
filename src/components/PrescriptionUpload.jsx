import React, { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const PrescriptionUpload = ({ onUploadComplete, onFilesSelected, existingFiles = [], required = false }) => {
  const [files, setFiles] = useState(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [previews, setPreviews] = useState({})
  const fileInputRef = useRef(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]

  const validateFile = (file) => {
    const errors = []

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size must be less than 5MB`)
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`File type must be JPG, PNG, WEBP, or PDF`)
    }

    return errors
  }

  const generatePreview = (file) => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({ url: reader.result, type: 'image' })
        }
        reader.readAsDataURL(file)
      } else if (file.type === 'application/pdf') {
        resolve({ url: null, type: 'pdf' })
      } else {
        resolve({ url: null, type: 'unknown' })
      }
    })
  }

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    if (selectedFiles.length === 0) return

    // Validate all files
    const validFiles = []
    for (const file of selectedFiles) {
      const errors = validateFile(file)
      if (errors.length > 0) {
        toast.error(`${file.name}: ${errors.join(', ')}`)
      } else {
        validFiles.push(file)
      }
    }

    if (validFiles.length === 0) return

    // Generate previews
    const newPreviews = { ...previews }
    for (const file of validFiles) {
      const preview = await generatePreview(file)
      newPreviews[file.name] = preview
    }
    setPreviews(newPreviews)

    // Add to files list
    const newFiles = [...files, ...validFiles]
    setFiles(newFiles)
    
    // Notify parent component of selected files
    if (onFilesSelected) {
      onFilesSelected(newFiles)
    }
    
    toast.success(`${validFiles.length} file(s) selected`)

    // Clear input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    
    // Notify parent component of file removal
    if (onFilesSelected) {
      onFilesSelected(newFiles)
    }
    
    const removedFile = files[index]
    if (removedFile.name) {
      const newPreviews = { ...previews }
      delete newPreviews[removedFile.name]
      setPreviews(newPreviews)
    }
    
    toast.success('File removed')
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file')
      return
    }

    setUploading(true)

    try {
      const uploadedUrls = []

      for (const file of files) {
        // Skip if already uploaded (has url property)
        if (file.url) {
          uploadedUrls.push(file.url)
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const fileExt = file.name.split('.').pop()
        const fileName = `prescription_${timestamp}_${randomStr}.${fileExt}`
        const filePath = `prescriptions/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('prescriptions')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('Upload error:', error)
          throw new Error(`Failed to upload ${file.name}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('prescriptions')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      toast.success('Prescription(s) uploaded successfully')
      
      // Call callback with uploaded URLs
      if (onUploadComplete) {
        onUploadComplete(uploadedUrls)
      }

      return uploadedUrls
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload prescriptions')
      throw error
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) {
      return <Image className="w-5 h-5" />
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5" />
    } else {
      return <FileText className="w-5 h-5" />
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Prescription{required && ' *'}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Upload your prescription as JPG, PNG, or PDF (max 5MB per file)
          </p>

          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <span className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload className="w-5 h-5 mr-2" />
                Select Files
              </span>
            </label>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            You can select multiple files at once
          </p>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Selected Files ({files.length})
          </h4>
          
          {files.map((file, index) => {
            const preview = previews[file.name]
            
            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-start space-x-4"
              >
                {/* Preview or Icon */}
                <div className="flex-shrink-0">
                  {preview?.type === 'image' && preview.url ? (
                    <img
                      src={preview.url}
                      alt="Prescription preview"
                      className="w-16 h-16 object-cover rounded border border-gray-200"
                    />
                  ) : preview?.type === 'pdf' ? (
                    <div className="w-16 h-16 bg-red-50 rounded flex items-center justify-center">
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-50 rounded flex items-center justify-center">
                      {getFileIcon(file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {file.url && (
                    <div className="mt-1 flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Uploaded
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={uploading}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Messages */}
      <div className="space-y-2">
        {required && files.length === 0 && (
          <div className="flex items-start space-x-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Prescription upload is required to proceed with your order</span>
          </div>
        )}

        <div className="flex items-start space-x-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Prescription Guidelines:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
              <li>Upload a clear, readable image or PDF of your prescription</li>
              <li>Prescription must be valid and signed by a registered doctor</li>
              <li>Ensure all medicine names are clearly visible</li>
              <li>File size should not exceed 5MB</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export upload function for parent component */}
      {onUploadComplete && (
        <input
          type="hidden"
          data-upload-handler="true"
          ref={(el) => {
            if (el) {
              el.uploadFiles = handleUpload
            }
          }}
        />
      )}
    </div>
  )
}

// Export function to be used by parent components
PrescriptionUpload.uploadFiles = (component) => {
  const input = component?.querySelector('[data-upload-handler="true"]')
  return input?.uploadFiles?.()
}

export default PrescriptionUpload
