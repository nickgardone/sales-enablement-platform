import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/platform/entitlements";
import type { CurrentUser } from "@/lib/platform/types";
import type { ForecastSummary, MonthForecastRow, StageForecastRow } from "./types";

const MODULE_ID = "forecasting-pipeline";

/** Leader-scoped rollup over Closing Deals with a simple probability-weighted forecast. */
export async function getForecastForUser(user: CurrentUser): Promise<ForecastSummary> {
  const rooftopWhere = await scopeFilter(user, "Rooftop", MODULE_ID);
  const opportunities = await prisma.opportunity.findMany({
    where: { rooftop: rooftopWhere, dealStage: { isClosed: false } },
    include: { dealStage: true },
  });

  const totalPipelineValue = opportunities.reduce((sum, o) => sum + o.expectedValue, 0);
  const weightedForecast = opportunities.reduce((sum, o) => sum + o.expectedValue * (o.dealStage.defaultProbability / 100), 0);

  const stageMap = new Map<string, StageForecastRow>();
  for (const o of opportunities) {
    const key = o.dealStage.id;
    const existing = stageMap.get(key) ?? {
      stageName: o.dealStage.name,
      sortOrder: o.dealStage.sortOrder,
      probability: o.dealStage.defaultProbability,
      opportunityCount: 0,
      totalValue: 0,
      weightedValue: 0,
    };
    existing.opportunityCount += 1;
    existing.totalValue += o.expectedValue;
    existing.weightedValue += o.expectedValue * (o.dealStage.defaultProbability / 100);
    stageMap.set(key, existing);
  }
  const byStage = Array.from(stageMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);

  const monthMap = new Map<string, MonthForecastRow>();
  for (const o of opportunities) {
    const month = `${o.closeDate.getFullYear()}-${String(o.closeDate.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(month) ?? {
      month,
      monthLabel: o.closeDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      opportunityCount: 0,
      totalValue: 0,
      weightedValue: 0,
    };
    existing.opportunityCount += 1;
    existing.totalValue += o.expectedValue;
    existing.weightedValue += o.expectedValue * (o.dealStage.defaultProbability / 100);
    monthMap.set(month, existing);
  }
  const byMonth = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return { openOpportunityCount: opportunities.length, totalPipelineValue, weightedForecast, byStage, byMonth };
}
