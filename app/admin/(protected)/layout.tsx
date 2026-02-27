import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/dashboard/user-nav";
import { MainNav } from "@/components/dashboard/main-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 justify-between">
          <div className="font-bold text-lg">
            Modern Nursery School Admin
          </div>
          <div className="flex items-center space-x-4">
            <UserNav user={session.user} />
          </div>
        </div>
        <div className="border-t px-4 py-2 overflow-x-auto">
          <MainNav role="admin" />
        </div>
      </header>
      <main className="flex-1 space-y-4 p-8 pt-6">
        {children}
      </main>
    </div>
  );
}
