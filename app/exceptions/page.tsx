import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExceptionsTable } from "@/components/pricing-exceptions/exceptions-table";
import { IntakeDialog } from "@/components/pricing-exceptions/intake-dialog";
import { ApproverQueue } from "@/components/pricing-exceptions/approver-queue";
import {
  getApproverQueueForRole,
  getContactOptionsForUser,
  getExceptionsForUser,
  getRooftopOptionsForUser,
} from "@/lib/modules/pricing-exceptions/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, allowed } = await getModuleAccess("pricing-exceptions");
  if (!allowed) return <AccessRestricted moduleName="Pricing Exceptions" role={user.role} />;

  const [rows, rooftops, contacts] = await Promise.all([
    getExceptionsForUser(user),
    getRooftopOptionsForUser(user),
    getContactOptionsForUser(user),
  ]);

  const queue = user.role === "SALES_LEADER" ? await getApproverQueueForRole("SALES_LEADER") : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing Exceptions</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "SALES_LEADER" ? "Your team's territory" : "Your book"} — {rows.length} requests.
          </p>
        </div>
        <IntakeDialog rooftops={rooftops} contacts={contacts} />
      </div>

      {queue ? (
        <Tabs defaultValue="exceptions">
          <TabsList>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            <TabsTrigger value="queue">
              Approver queue{queue.length > 0 ? ` (${queue.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="exceptions">
            <ExceptionsTable rows={rows} />
          </TabsContent>
          <TabsContent value="queue">
            <ApproverQueue rows={queue} title="Your approver queue" />
          </TabsContent>
        </Tabs>
      ) : (
        <ExceptionsTable rows={rows} />
      )}
    </div>
  );
}
