import { getClasses } from "@/actions/student"
import { WhatsAppNotificationForm } from "@/components/whatsapp/whatsapp-notification-form"
import { WhatsAppHistory } from "@/components/whatsapp/whatsapp-history"
import { getWhatsAppHistory, getWhatsAppSummary } from "@/actions/whatsapp-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function WhatsAppPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [classes, history, summary] = await Promise.all([
    getClasses(),
    getWhatsAppHistory(),
    getWhatsAppSummary(),
  ]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-3xl font-bold tracking-tight">WhatsApp Notifications</h2>
      </div>
      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History & Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="compose">
          <WhatsAppNotificationForm classes={classes} />
        </TabsContent>
        <TabsContent value="history">
          <WhatsAppHistory history={history} summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
