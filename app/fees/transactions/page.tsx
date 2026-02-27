import { getFeeTransactions, getTransactionStats } from '@/actions/fee-transactions'
import { TransactionContent } from '@/components/fees/transaction-content'
import Class from '@/models/Class'
import dbConnect from '@/lib/db'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  await dbConnect()
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === 'admin'

  // Initial load with no filters
  const page = 1
  const filter = {}

  const [{ transactions, pagination }, stats, classes] = await Promise.all([
    getFeeTransactions(filter, page),
    getTransactionStats(filter),
    Class.find({}).select('name').lean()
  ])

  return (
    <TransactionContent
      initialTransactions={transactions}
      initialPagination={pagination}
      initialStats={stats}
      classes={classes.map(c => ({ id: c._id.toString(), name: c.name }))}
      isAdmin={isAdmin}
    />
  )
}
