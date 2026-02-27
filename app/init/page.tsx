"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { initializeSystem, checkInitializationStatus } from "@/actions/init"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function InitPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'initialized' | 'error'>('checking')
  const [error, setError] = useState("")
  const [isInitializing, setIsInitializing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkInitializationStatus().then((result) => {
        if (result.isInitialized) {
            setStatus('initialized');
        } else {
            setStatus('ready');
        }
    }).catch(err => {
        setStatus('error');
        setError(err.message);
    });
  }, [])

  const handleInitialize = async () => {
    setIsInitializing(true)
    try {
      const result = await initializeSystem()
      if (result.success) {
        setStatus('initialized')
        // Redirect to admin login after a short delay
        setTimeout(() => {
            router.push('/admin/login');
        }, 2000);
      } else {
        setError(result.error || "Initialization failed")
        setStatus('error')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message)
      setStatus('error')
    } finally {
      setIsInitializing(false)
    }
  }

  if (status === 'checking') {
      return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (status === 'initialized') {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-6 w-6" />
                        System Initialized
                    </CardTitle>
                    <CardDescription>
                        The super admin account is ready. Redirecting to login...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => router.push('/admin/login')}>
                        Go to Admin Login
                    </Button>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>
            Your database appears to be empty. Click below to create the default Super Admin account and seed basic data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Default Credentials</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Username: <strong>Admin</strong></p>
                  <p>Password: <strong>123</strong></p>
                </div>
              </div>
            </div>
          </div>
          
          {error && (
             <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                 {error}
             </div>
          )}

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleInitialize} 
            disabled={isInitializing}
          >
            {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initialize System
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
