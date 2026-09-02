import type {
  FormEvent,
} from "react";

import type {
  PollutantCode,
} from "@/lib/domain/air-quality.types";

import { Search } from "lucide-react";

interface ExploreFiltersProps {
  pollutant: PollutantCode;
  municipality: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
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
  event: FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();
  onSubmit();
};

  return (
    <form 
      onSubmit={handleSubmit} 
      className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-end gap-4"
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm py-2 px-3 text-slate-900 bg-white"
          />
        </div>
      </div>

      {/* Button */}
      <div className="flex-shrink-0 mt-2 xl:mt-0">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full xl:w-auto inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ricerca...
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