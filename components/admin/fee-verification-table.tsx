"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { verifyFee } from "@/actions/fee"
import { format } from "date-fns"
import { useSession } from "next-auth/react"

interface Transaction {
  id: string
  studentName: string
  regNo: string
  className: string
  collectedBy: string
  amount: number
  feeType: string
  month?: number
  year: number
  date: Date
  receiptNumber: string
}

interface FeeVerificationTableProps {
  initialTransactions: Transaction[]
}

export function FeeVerificationTable({ initialTransactions }: FeeVerificationTableProps) {
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function handleVerify(id: string, action: 'approve' | 'reject') {
    if (!session?.user?.id) return;
    
    setProcessingId(id)
    try {
      const result = await verifyFee(id, action, session.user.id)
      if (result.success) {
        toast.success(`Fee ${action === 'approve' ? 'verified' : 'rejected'} successfully`)
        setTransactions(prev => prev.filter(t => t.id !== id))
      } else {
        toast.error(`Failed to ${action} fee: ${result.error}`)
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt No</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Collected By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                No pending transactions to verify.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.receiptNumber}</TableCell>
                <TableCell>
                  <div className="font-medium">{t.studentName}</div>
                  <div className="text-xs text-muted-foreground">{t.regNo}</div>
                </TableCell>
                <TableCell>{t.className}</TableCell>
                <TableCell className="capitalize">{t.feeType}</TableCell>
                <TableCell>₹{t.amount.toLocaleString()}</TableCell>
                <TableCell>{t.month}/{t.year}</TableCell>
                <TableCell>{t.collectedBy}</TableCell>
                <TableCell>{format(new Date(t.date), "MMM d, HH:mm")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleVerify(t.id, 'approve')}
                      disabled={processingId === t.id}
                    >
                      {processingId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleVerify(t.id, 'reject')}
                      disabled={processingId === t.id}
                    >
                      {processingId === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
