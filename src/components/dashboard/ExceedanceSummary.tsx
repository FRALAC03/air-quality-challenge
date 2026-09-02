import type { ExploreDataResult } from "@/lib/domain/air-quality.types";
import { Info } from "lucide-react";

interface ExceedanceSummaryProps {
  exceedances: ExploreDataResult["exceedances"];
  municipality: string;
}

export default function ExceedanceSummary({ exceedances, municipality }: ExceedanceSummaryProps) {
  
  if (!exceedances) return null;

  const isNotAssessable = exceedances.status === "NOT_ASSESSABLE";
  
  let content = "Compliance normativa non valutabile per il periodo selezionato.";

  if (isNotAssessable) {
  content =
    exceedances.message ??
    exceedances.metadata?.note ??
    "Compliance normativa non valutabile per il periodo selezionato.";
}
   else if ("value" in exceedances && exceedances.metric === "MUNICIPALITY_EXCEEDANCE_DAYS") {
    const val = exceedances.value;
    if (val !== null) {
      content = `${val} ${val === 1 ? 'giorno' : 'giorni'} con almeno un superamento nel comune`;
    }
  } else if ("results" in exceedances && exceedances.metric === "MUNICIPALITY_EXCEEDANCE_HOURS") {
    const targetMun = exceedances.results.find(r => r.municipality === municipality);
    const hours = targetMun ? targetMun.exceedanceHours : 0;
    content = `${hours} ${hours === 1 ? 'ora' : 'ore'} di superamento nel periodo selezionato`;
  }

  return (
    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start sm:items-center gap-3 shadow-sm">
      <div className="bg-white p-1.5 rounded-full border border-slate-100 shrink-0">
        <Info className="w-5 h-5 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-700 leading-snug">
        {content}
      </p>
    </div>
  );
}