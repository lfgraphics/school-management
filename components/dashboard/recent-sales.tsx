import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

interface RecentSalesProps {
  sales: {
    id: string
    amount: number
    studentName: string
    contactNumber: string
    studentPhoto?: string
    status: string
  }[]
}

export function RecentSales({ sales }: RecentSalesProps) {
  if (sales.length === 0) {
    return <div className="text-sm text-muted-foreground">No recent transactions.</div>
  }

  return (
    <div className="space-y-8">
      {sales.map((sale) => (
        <div key={sale.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={sale.studentPhoto} alt={sale.studentName} />
            <AvatarFallback>{sale.studentName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.studentName}</p>
            <p className="text-sm text-muted-foreground">
              {sale.contactNumber}
            </p>
          </div>
          <div className="ml-auto font-medium">
            +₹{sale.amount.toLocaleString()}
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${sale.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
              {sale.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
