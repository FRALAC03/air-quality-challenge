import { FileSearch } from "lucide-react";

export default function NoDataState() {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 border-dashed rounded-xl p-12 text-center h-full min-h-[300px]">
      <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100">
        <FileSearch className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        Nessun dato disponibile
      </h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">
        Non ci sono misurazioni valide per i parametri e il periodo selezionati. Prova a modificare i filtri.
      </p>
    </div>
  );
}