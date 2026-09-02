import type { PollutantCode } from "@/lib/domain/air-quality.types";
import { Search, LoaderCircle } from "lucide-react";
import type {
  FormEvent,
} from "react";

interface ExploreFiltersProps {
  pollutant: PollutantCode;
  municipality: string;
  startDate: string; 
  endDate: string;   
  municipalities: string[];
  isLoading: boolean;
  onPollutantChange: (v: PollutantCode) => void;
  onMunicipalityChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onSubmit: () => void;
}

export default function ExploreFilters({
  pollutant,
  municipality,
  startDate,
  endDate,
  municipalities,
  isLoading,
  onPollutantChange,
  onMunicipalityChange,
  onStartDateChange,
  onEndDateChange,
  onSubmit
}: ExploreFiltersProps) {
  
  const handleSubmit = (
  e: FormEvent<HTMLFormElement>,
) => {
  e.preventDefault();

  if (isLoading) {
    return;
  }

  onSubmit();
};

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-end gap-4 sm:gap-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        
        {/* Pollutant */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pollutant-select" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Inquinante
          </label>
          <select
            id="pollutant-select"
            value={pollutant}
            onChange={(e) => onPollutantChange(e.target.value as PollutantCode)}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm py-2 px-3 text-slate-900 bg-white"
          >
            <option value="PM10">PM10</option>
            <option value="PM25">PM2.5</option>
            <option value="NO2">NO2</option>
            <option value="O3">O3</option>
          </select>
        </div>

        {/* Municipality */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="municipality-select" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Comune
          </label>
          <select
            id="municipality-select"
            value={municipality}
            onChange={(e) => onMunicipalityChange(e.target.value)}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm py-2 px-3 text-slate-900 bg-white"
          >
            {municipalities.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="start-date" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Da
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm py-2 px-3 text-slate-900 bg-white"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="end-date" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
            A (incluso)
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm py-2 px-3 text-slate-900 bg-white"
          />
        </div>
      </div>

      {/* Button */}
      <div className="flex-shrink-0 mt-1 xl:mt-0 w-full xl:w-auto">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus-visible:ring-2 disabled:opacity-75 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center">
              <LoaderCircle className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Caricamento...
            </span>
          ) : (
            <span className="flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Esplora Dati
            </span>
          )}
        </button>
      </div>
    </form>
  );
}