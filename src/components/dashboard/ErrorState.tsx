import { AlertTriangle, RefreshCcw } from "lucide-react";

interface ErrorStateProps {
  onRetry: () => void;
}

export default function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-rose-50 p-4 rounded-full">
        <AlertTriangle className="w-8 h-8 text-rose-600" />
      </div>
      <h2 className="mt-6 text-xl font-bold text-slate-900">Impossibile caricare i dati della dashboard.</h2>
      <p className="mt-2 text-slate-500 max-w-md text-center">
        Si è verificato un errore di connessione con il sistema centrale.
      </p>
      <button 
        onClick={onRetry}
        className="mt-8 flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors focus:ring-4 focus:ring-slate-200"
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        Riprova
      </button>
    </div>
  );
}