"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

type ConfirmContextType = {
  confirm: (options?: ConfirmOptions | string) => Promise<boolean>
}

const ConfirmContext = React.createContext<ConfirmContextType | undefined>(
  undefined
)

export function useConfirm() {
  const context = React.useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return context
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<ConfirmOptions>({})
  const [resolveRef, setResolveRef] = React.useState<(value: boolean) => void>(
    () => {}
  )

  const confirm = React.useCallback(
    (opts?: ConfirmOptions | string) => {
      const defaultOptions: ConfirmOptions = {
        title: "Are you sure?",
        description: "This action cannot be undone.",
        confirmText: "Confirm",
        cancelText: "Cancel",
        variant: "default",
      }

      let newOptions = defaultOptions
      if (typeof opts === "string") {
        newOptions = { ...defaultOptions, description: opts }
      } else if (opts) {
        newOptions = { ...defaultOptions, ...opts }
      }
      setOptions(newOptions)
      setOpen(true)

      return new Promise<boolean>((resolve) => {
        setResolveRef(() => resolve)
      })
    },
    []
  )

  const handleConfirm = () => {
    setOpen(false)
    resolveRef(true)
  }

  const handleCancel = () => {
    setOpen(false)
    resolveRef(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {options.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              variant={options.variant || "default"}
            >
              {options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
