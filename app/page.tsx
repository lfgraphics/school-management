import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    if (session.user.role === "admin") {
      redirect("/admin/dashboard");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 gap-4">
      <h1 className="text-4xl font-bold tracking-tight">Modern Nursery School</h1>
      <p className="text-muted-foreground">Management System</p>
      <div className="flex gap-4 mt-8">
        <Button asChild variant="default">
          <Link href="/login">Staff Login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/login">Admin Login</Link>
        </Button>
      </div>
    </div>
  );
}
