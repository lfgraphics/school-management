import { getClasses } from '@/actions/class';
import ReportsView from '@/components/reports/reports-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports & Analytics | Modern Nursery',
  description: 'Comprehensive reports for attendance and fees.',
};

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const classes = await getClasses();
  
  // Transform classes to match the expected interface { id: string, name: string }
  // getClasses returns { id: string, name: string, exams: string[] }
  const formattedClasses = classes.map((c: any) => ({
    id: c.id,
    name: c.name,
  }));

  return <ReportsView classes={formattedClasses} />;
}
