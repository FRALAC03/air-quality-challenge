import { TrendingDown, TrendingUp, Minus, AlertCircle } from "lucide-react";
import type { DashboardKpiResult } from "@/lib/domain/air-quality.types";
import { formatMeasurementValue, formatPercentage } from "@/lib/frontend/display-formatters";

interface KpiCardProps {
  kpi: DashboardKpiResult;
}

export default function KpiCard({ kpi }: KpiCardProps) {
  // Parsing API status
  const isNoData = kpi.status === "NO_DATA";
  
  // Format string
  const displayLabel = kpi.pollutant === "PM25" ? "PM2.5" : kpi.pollutant;
  const valString = formatMeasurementValue(kpi.currentAverage);
  const pctString = formatPercentage(kpi.percentageChange);
  
  // Trend Visuals
  const TrendIcon = kpi.trend === "IMPROVING" ? TrendingDown : 
                    kpi.trend === "WORSENING" ? TrendingUp : 
                    Minus;

  // I colori suggeriscono il trend, NON la normatività (che è gestita da Explore)
  const trendColorClass = kpi.trend === "IMPROVING" ? "text-emerald-600" :
                          kpi.trend === "WORSENING" ? "text-rose-600" :
                          "text-slate-500";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      
      {/* Intestazione */}
      <h3 className="text-sm font-bold text-slate-500 tracking-wide">{displayLabel}</h3>
      
      {isNoData ? (
        <div className="mt-4 flex items-center text-slate-400 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          Dati non sufficienti
        </div>
      ) : (
        <>
          {/* Main Value */}
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900">{valString}</span>
            <span className="text-sm font-medium text-slate-500">{kpi.unit}</span>
          </div>

          {/* Trend Indicator */}
          {kpi.trend && (
            <div className={`mt-3 flex items-center text-sm font-medium ${trendColorClass}`}>
              <TrendIcon className="w-4 h-4 mr-1.5 stroke-2" />
              <span>{pctString} vs period prec.</span>
            </div>
          )}
        </>
      )}

      {/* Note PM25 (Spinte sempre in fondo alla card) */}
      <div className="flex-1" />
      {kpi.complianceStatus === "NOT_ASSESSABLE" && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[11px] leading-tight text-slate-400">
            {kpi.note || "Compliance non valutabile"}
          </p>
        </div>
      )}
      
    </div>
  );
}