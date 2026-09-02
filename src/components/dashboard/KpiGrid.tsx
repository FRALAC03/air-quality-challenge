import type {
  DashboardKpiResult,
  PollutantCode,
} from "@/lib/domain/air-quality.types";

import KpiCard from "./KpiCard";

interface KpiGridProps {
  kpis: DashboardKpiResult[];
}

const KPI_ORDER: PollutantCode[] = [
  "PM10",
  "PM25",
  "NO2",
  "O3",
];

export default function KpiGrid({
  kpis,
}: KpiGridProps) {
  const orderedKpis = KPI_ORDER
    .map((code) =>
      kpis.find(
        (kpi) =>
          kpi.pollutant === code,
      ),
    )
    .filter(
      (
        kpi,
      ): kpi is DashboardKpiResult =>
        kpi !== undefined,
    );

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {orderedKpis.map((kpi) => (
        <KpiCard
          key={kpi.pollutant}
          kpi={kpi}
        />
      ))}
    </section>
  );
}