import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleAccess } from "@/lib/platform/route-guard";
import { scopeFilter } from "@/lib/platform/entitlements";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { AuditTrail } from "@/components/shared/audit-trail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExceptionArtifact } from "@/components/pricing-exceptions/exception-artifact";
import { DecideStepPanel } from "@/components/pricing-exceptions/decide-step-panel";
import { getExceptionDetail } from "@/lib/modules/pricing-exceptions/queries";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await getModuleAccess("pricing-exceptions");
  if (!allowed) return <AccessRestricted moduleName="Pricing Exceptions" role={user.role} />;

  const scopeWhere = await scopeFilter(user, "Rooftop", "pricing-exceptions");
  const exception = await prisma.exceptionRequest.findFirst({ where: { id, rooftop: scopeWhere }, select: { id: true } });
  if (!exception) return <AccessRestricted moduleName="Pricing Exceptions" role={user.role} />;

  const detail = await getExceptionDetail(id);
  if (!detail) notFound();

  const activeStep = detail.approvalRequest?.activeStep;
  const canDecideHere = activeStep && activeStep.approverRole === user.role;

  // Submission is audited against the ExceptionRequest itself; each approval
  // decision is audited against its ApprovalStep — the full chain is the union.
  const auditEntities = [
    { entityType: "ExceptionRequest", entityId: detail.id },
    ...(detail.approvalRequest?.steps.map((s) => ({ entityType: "ApprovalStep", entityId: s.id })) ?? []),
  ];

  return (
    <div className="space-y-6">
      <ExceptionArtifact detail={detail} />
      {canDecideHere && detail.approvalRequest && (
        <DecideStepPanel
          exceptionRequestId={detail.id}
          approvalRequestId={detail.approvalRequest.id}
          stepId={activeStep.id}
          approverRole={activeStep.approverRole}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTrail entities={auditEntities} />
        </CardContent>
      </Card>
    </div>
  );
}
