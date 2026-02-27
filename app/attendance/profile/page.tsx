import { ProfileForm } from "@/components/profile/profile-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AttendanceProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
      </div>
      <div className="grid gap-4">
        <ProfileForm user={{
          name: session.user.name || "",
          email: session.user.email || ""
        }} />
      </div>
    </div>
  );
}
