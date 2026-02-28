"use client"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void
  label?: string
  accept?: string
  className?: string
  previewUrl?: string | null
}

export function FileUploader({
  onFileSelect,
  label = "Upload File",
  accept = "image/*",
  className = "",
  previewUrl
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const handleFile = (file: File) => {
    // Create local preview
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    
    // Pass file back to parent
    onFileSelect(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalPreview(null)
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  // Determine which preview to show (local > prop)
  const displayPreview = localPreview || previewUrl

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden ${dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerUpload}
      >
        {displayPreview ? (
          <div className="relative w-full h-full group">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img 
               src={displayPreview} 
               alt="Preview" 
               className="w-full h-full object-contain"
             />
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-sm font-medium">Click to Change</p>
             </div>
             <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-2">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
          </div>
        )}
        
        <input 
          ref={fileInputRef}
          type="file" 
          accept={accept} 
          className="hidden" 
          onChange={handleChange} 
        />
      </div>
    </div>
  )
}
