export type StageForecastRow = {
  stageName: string;
  sortOrder: number;
  probability: number;
  opportunityCount: number;
  totalValue: number;
  weightedValue: number;
};

export type MonthForecastRow = {
  month: string;
  monthLabel: string;
  opportunityCount: number;
  totalValue: number;
  weightedValue: number;
};

export type ForecastSummary = {
  openOpportunityCount: number;
  totalPipelineValue: number;
  weightedForecast: number;
  byStage: StageForecastRow[];
  byMonth: MonthForecastRow[];
};
