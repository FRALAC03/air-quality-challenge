"use client";

import { useState } from "react";
import { apiClient } from "@/lib/frontend/api-client";
import type { PollutantCode, ExploreDataResult } from "@/lib/domain/air-quality.types";
import { AlertTriangle, Activity, Search } from "lucide-react";
import { subtractFloatingDays } from "@/lib/domain/date-utils";
import ExploreFilters from "./ExploreFilters";
import NoDataState from "./NoDataState";
import AirQualityChart from "./AirQualityChart";
import ExceedanceSummary from "./ExceedanceSummary";
import { formatFloatingDate } from "@/lib/frontend/display-formatters";

interface ExplorePanelProps {
  municipalities: string[];
}

export default function ExplorePanel({ municipalities }: ExplorePanelProps) {
  const initialMunicipality = municipalities.includes("Milano") ? "Milano" : (municipalities[0] || "");
  
  const [pollutant, setPollutant] = useState<PollutantCode>("PM10");
  const [municipality, setMunicipality] = useState(initialMunicipality);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");
  
  const [data, setData] = useState<ExploreDataResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Nuovo stato: traccia se è la primissima visualizzazione del pannello
  const [hasSearched, setHasSearched] = useState(false); 

  const handleFetch = async () => {
    setErrorMsg(null);
    setHasSearched(true);
    
    if (!municipality.trim()) {
      setErrorMsg("Seleziona un comune.");
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg("Seleziona il periodo desiderato.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.getExploreData(
        pollutant,
        municipality.trim(),
        startDate,
        endDate
      );

      if (result.status === "INVALID_REQUEST") {
        setErrorMsg(result.message || "Parametri non validi.");
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error("Explore fetch error:", err);
      setErrorMsg("Impossibile caricare i dati selezionati.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isNoData = data?.status === "NO_DATA";
  const isOk = data?.status === "OK" && data.timeseries.length > 0;

  // Derivazione informazioni per il sub-header
  const distinctStationsCount = isOk ? new Set(data.timeseries.map(p => p.stationId)).size : 0;
  const inclusiveEnd =
  isOk
    ? subtractFloatingDays(data.period.end, 1)
    : null;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
      
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-700" />
          Esplora i dati
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Analizza le misurazioni per inquinante, comune e periodo.
        </p>
      </div>

      <ExploreFilters
        pollutant={pollutant}
        municipality={municipality}
        startDate={startDate}
        endDate={endDate}
        municipalities={municipalities}
        isLoading={isLoading}
        onPollutantChange={setPollutant}
        onMunicipalityChange={setMunicipality}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSubmit={handleFetch}
      />

      {/* Area dei risultati */}
      <div className="mt-8">
        
        {errorMsg && (
          <div className="p-4 mb-6 bg-rose-50 rounded-lg border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-800">{errorMsg}</p>
          </div>
        )}

        {!hasSearched && !isLoading && !data && !errorMsg && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Search className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">Seleziona i filtri e avvia una ricerca per visualizzare la serie temporale.</p>
          </div>
        )}

        {hasSearched && isNoData && !isLoading && !errorMsg && <NoDataState />}

        {isOk && !errorMsg && (
          <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-100 pb-4 mb-6 gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{data.pollutant} • {data.municipality}</h3>
                <p className="mt-1 text-sm text-slate-500">
  {formatFloatingDate(data.period.start)}
  {" → "}
  {inclusiveEnd
    ? formatFloatingDate(inclusiveEnd)
    : "—"}
</p>
              </div>
              <div className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                {distinctStationsCount} {distinctStationsCount === 1 ? 'stazione' : 'stazioni'} rilevate
              </div>
            </div>

            {/* Accessibilità: SR-only description */}
            <p className="sr-only">Serie temporali delle stazioni disponibili per il periodo selezionato. Segue un riepilogo testuale dei superamenti normativi.</p>

            <AirQualityChart
  timeseries={data.timeseries}
  unit={data.measurementUnit}
/>

            <ExceedanceSummary exceedances={data.exceedances} municipality={data.municipality} />

          </div>
        )}

      </div>
    </section>
  );
}