"use client";

import { useState } from "react";
import { apiClient } from "@/lib/frontend/api-client";
import type { PollutantCode, ExploreDataResult } from "@/lib/domain/air-quality.types";
import { AlertTriangle, Activity } from "lucide-react";

import ExploreFilters from "./ExploreFilters";
import NoDataState from "./NoDataState";

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

  const handleFetch = async () => {
    setErrorMsg(null);
    
    // Validazione base Client-side
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

  // Status Booleans
  const isNoData = data?.status === "NO_DATA";
  const isOk = data?.status === "OK" && data.timeseries.length > 0;

  // Derivazione temporanea per il preview tecnico (senza cast)
  let excValueStr = "—";
  let excMetric = "—";
  let excStatus = "—";

  if (isOk && data.exceedances) {
    excStatus = data.exceedances.status;
    
    if (excStatus === "NOT_ASSESSABLE") {
      excMetric = "Regulatory Limit";
      excValueStr = "Non Valutabile";
    } else if ("value" in data.exceedances) {
      // ExceedanceResult (PM10)
      excMetric = data.exceedances.metric;
      excValueStr = `${data.exceedances.value} ${data.exceedances.unit}`;
    } else if ("results" in data.exceedances) {
      // HourlyExceedanceResult (O3, NO2)
      excMetric = data.exceedances.metric;
      const targetMun =
  data.exceedances.results.find(
    (result) =>
      result.municipality ===
      data.municipality,
  );
      excValueStr = targetMun ? `${targetMun.exceedanceHours} hours` : "0 hours";
    }
  }

  // Count distinct stations
  const distinctStations = isOk 
    ? new Set(data.timeseries.map(p => p.stationId)).size 
    : 0;

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
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-800">{errorMsg}</p>
          </div>
        )}

        {isNoData && <NoDataState />}

        {isOk && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-3 mb-4">
              Risultato Tecnico (Preview Temporanea)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Inquinante & Comune</span>
                <span className="text-sm font-semibold text-slate-900">{data.pollutant} • {data.municipality}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Periodo selezionato</span>
                <span className="text-sm font-medium text-slate-700">
                  {startDate} → {endDate}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dati Estratti</span>
                <span className="text-sm font-medium text-slate-700">
                  {data.timeseries.length} righe ({distinctStations} stazioni)
                </span>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-3 pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stato Exceedances</span>
                <div className="mt-1 flex items-center gap-3">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase ${
                    excStatus === 'OK' ? 'bg-emerald-100 text-emerald-800' :
                    excStatus === 'NOT_ASSESSABLE' ? 'bg-slate-200 text-slate-700' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {excStatus}
                  </span>
                  <span className="text-sm font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                    {excMetric} = {excValueStr}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}