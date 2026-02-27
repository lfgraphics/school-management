"use client"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImagePreview } from "@/components/ui/image-preview"

interface FileUploaderProps {
  value: string | null
  onChange: (value: string | null) => void
  label?: string
  accept?: string
  id?: string
  className?: string
  previewWidth?: number
  previewHeight?: number
}

export function FileUploader({
  value,
  onChange,
  label = "Upload File",
  accept = "image/*",
  id,
  className = "",
  previewWidth = 100,
  previewHeight = 100,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      onChange(reader.result as string)
    }
    reader.readAsDataURL(file)
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

  const handleRemove = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      
      {!value ? (
        <div 
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerUpload}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">Accepts {accept.replace("/*", "")} files</p>
          </div>
          <input 
            id={id} 
            ref={fileInputRef}
            type="file" 
            accept={accept} 
            className="hidden" 
            onChange={handleChange} 
          />
        </div>
      ) : (
        <div className="relative inline-block group">
          <ImagePreview 
            src={value} 
            alt="Preview" 
            width={previewWidth} 
            height={previewHeight} 
            className="rounded-md object-cover border" 
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
