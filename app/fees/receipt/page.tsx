'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ThermalReceipt } from '@/components/fees/thermal-receipt'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function ReceiptContent() {
  const searchParams = useSearchParams()
  
  const receiptData = {
    receiptNumber: searchParams.get('receiptNumber') || '',
    studentName: searchParams.get('studentName') || '',
    studentRegNo: searchParams.get('studentRegNo') || '',
    className: searchParams.get('className') || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feeType: searchParams.get('feeType') as any || 'monthly',
    months: searchParams.get('months')?.split(',').map(Number) || [],
    year: Number(searchParams.get('year')) || new Date().getFullYear(),
    examType: searchParams.get('examType') || '',
    title: searchParams.get('title') || '',
    amount: Number(searchParams.get('amount')) || 0,
    date: new Date()
  }

  const handlePrint = () => {
    window.print()
  }

  if (!receiptData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Action Buttons - Hidden on print */}
        <div className="flex gap-4 mb-6 print:hidden">
          <Link href="/fees/collect">
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Fee Collection
            </Button>
          </Link>

          <Button onClick={handlePrint} className="ml-auto">
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </div>

        {/* Receipt Preview */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <ThermalReceipt receiptData={receiptData} />
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .thermal-receipt {
              max-width: 80mm;
              margin: 0 auto;
              padding: 10mm;
            }
            
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  )
}
