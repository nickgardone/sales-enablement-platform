import { getModuleAccess } from "@/lib/platform/route-guard";
import { AccessRestricted } from "@/components/shared/access-restricted";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentLibrary } from "@/components/enablement-content/content-library";
import { getCertifications, getContentAssets, getPlaybooks } from "@/lib/modules/enablement-content/queries";

export const dynamic = "force-dynamic";

const PERSONA_LABEL: Record<string, string> = {
  DEALER_PRINCIPAL: "Dealer Principal",
  GENERAL_MANAGER: "General Manager",
  SALES_DESK_MANAGER: "Sales Desk Manager",
  FI_MANAGER: "F&I Manager",
  BDC_MANAGER: "BDC Manager",
  INTERNET_MANAGER: "Internet Manager",
};

export default async function Page() {
  const { user, allowed } = await getModuleAccess("enablement-content");
  if (!allowed) return <AccessRestricted moduleName="Enablement & Content" role={user.role} />;

  const [assets, playbooks, certifications] = await Promise.all([getContentAssets(), getPlaybooks(), getCertifications()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enablement & Content</h1>
        <p className="text-sm text-muted-foreground">Persona-filtered collateral, playbooks, and certifications.</p>
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Content Library</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <ContentLibrary assets={assets} />
        </TabsContent>
        <TabsContent value="playbooks">
          <div className="grid gap-3 sm:grid-cols-2">
            {playbooks.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{p.title}</CardTitle>
                  <div className="flex gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {PERSONA_LABEL[p.contactPersona] ?? p.contactPersona}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {p.productType === "FINANCING" ? "Financing" : "Software"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                    {p.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="certifications">
          <div className="grid gap-3 sm:grid-cols-2">
            {certifications.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                  {c.programName && (
                    <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                      {c.programName}
                    </Badge>
                  )}
                </CardHeader>
                {c.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
