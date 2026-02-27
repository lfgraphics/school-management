import { getUnpaidStudents } from '@/actions/unpaid-students'
import { UnpaidContent } from '@/components/fees/unpaid-content'
import Class from '@/models/Class'
import dbConnect from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function UnpaidStudentsPage() {
    await dbConnect()

    const initialStartDate = startOfMonth(new Date(new Date().getFullYear(), 0, 1))
    const initialEndDate = endOfMonth(new Date())

    const filter = {
        startDate: initialStartDate,
        endDate: initialEndDate
    }

    const [unpaidStudents, classes] = await Promise.all([
        getUnpaidStudents(filter),
        Class.find({}).select('name').lean()
    ])

    return (
        <UnpaidContent 
            initialStudents={unpaidStudents}
            classes={classes.map(c => ({ id: c._id.toString(), name: c.name }))}
            initialStartDate={initialStartDate}
            initialEndDate={initialEndDate}
        />
    )
}
