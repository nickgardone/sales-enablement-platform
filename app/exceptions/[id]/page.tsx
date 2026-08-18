import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getModuleAccess } from "@/lib/platform/route-guard";
import { scopeFilter } from "@/lib/platform/entitlements";
import { AccessRestricted } from "@/components/shared/access-restricted";
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
    </div>
  );
}
