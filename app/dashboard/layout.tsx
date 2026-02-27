import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/dashboard/user-nav";
import { MainNav } from "@/components/dashboard/main-nav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === 'attendance_staff') {
    redirect("/attendance/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="mr-4 hidden md:flex font-bold text-lg">
            Modern Nursery School Staff
          </div>
          <MainNav className="mx-6" role="staff" />
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
