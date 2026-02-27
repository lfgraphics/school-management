import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, IndianRupee, Activity } from "lucide-react"
import dbConnect from "@/lib/db"
import Student from "@/models/Student"
import FeeTransaction from "@/models/FeeTransaction"
import { startOfDay, endOfDay } from "date-fns"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import mongoose from "mongoose"

export default async function StaffDashboardPage() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  if (!session) return null;

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Students admitted today (Global)
  const studentsToday = await Student.countDocuments({
    createdAt: { $gte: todayStart, $lte: todayEnd }
  });

  const userId = new mongoose.Types.ObjectId(session.user.id);
  
  // Fees collected today (By current user)
  const feesTodayResult = await FeeTransaction.aggregate([
    { 
      $match: { 
        collectedBy: userId, 
        transactionDate: { $gte: todayStart, $lte: todayEnd }
      } 
    },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const feesAmountToday = feesTodayResult[0]?.total || 0;

  // Pending Approvals (By current user)
  const pendingApprovals = await FeeTransaction.countDocuments({
    collectedBy: session.user.id,
    status: 'pending'
  });

  // Recent Activity Placeholder
  // Ideally, this would fetch recent actions logged for the user.
  // For now, we can show recent transactions collected by this user.
  const recentTransactions = await FeeTransaction.find({ collectedBy: session.user.id })
    .sort({ transactionDate: -1 })
    .limit(5)
    .populate('studentId', 'name')
    .lean();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Staff Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Admitted Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsToday}</div>
            <p className="text-xs text-muted-foreground">Global admissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Collections Today</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{feesAmountToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fees collected by you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Pending Approvals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Transactions awaiting verification</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                    {recentTransactions.map((tx: any) => (
                        <div key={tx._id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Collected fee from <span className="font-bold">{tx.studentId?.name || 'Unknown Student'}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(tx.transactionDate).toLocaleString()}
                                </p>
                            </div>
                            <div className="font-medium text-sm">
                                +₹{tx.amount.toLocaleString()}
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                    tx.status === 'verified' ? 'bg-green-100 text-green-800' : 
                                    tx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {tx.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    No recent activity found.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
