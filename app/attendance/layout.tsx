import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/dashboard/user-nav";
import Link from "next/link";

export default async function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only allow attendance_staff and admin
  if (session.user.role !== 'attendance_staff' && session.user.role !== 'admin') {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link href="/attendance/dashboard" className="mr-4 font-bold text-lg">
            Attendance Management
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav user={session.user} />
          </div>
        </div>
      </header>
      <main className="flex-1 space-y-4 p-8 pt-6">
        {children}
      </main>
    </div>
  );
}
