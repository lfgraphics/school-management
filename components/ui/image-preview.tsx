"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Loader2, ImageOff } from "lucide-react"

interface ImagePreviewProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

export function ImagePreview({ src, alt, className, width, height }: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div 
          className={cn("relative cursor-pointer group overflow-hidden rounded-md border", className)}
          style={{ width: width ? `${width}px` : undefined, height: height ? `${height}px` : undefined }}
        >
            {hasError ? (
                 <div className="flex h-full w-full items-center justify-center bg-muted">
                    <ImageOff className="h-6 w-6 text-muted-foreground" />
                 </div>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                    src={src} 
                    alt={alt} 
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    onError={() => setHasError(true)}
                />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
        <DialogTitle />
        <div className="relative flex items-center justify-center min-h-[200px] bg-black/50 rounded-lg">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                src={src} 
                alt={alt} 
                className="max-h-[85vh] max-w-full object-contain rounded-md"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                }}
            />
             {hasError && !isLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <ImageOff className="h-12 w-12 mb-2" />
                    <p>Failed to load image</p>
                 </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
