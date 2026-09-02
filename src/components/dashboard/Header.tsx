import { formatFloatingDate } from "@/lib/frontend/display-formatters";

interface HeaderProps {
  maxDate: string | null;
}

export default function Header({ maxDate }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-5 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Air Quality Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">Monitoraggio e analisi dei dati ARPA</p>
      </div>

      <div className="sm:text-right">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Ultimo aggiornamento dataset</p>
        <p className="text-sm font-medium text-slate-700 mt-1">
          {maxDate ? formatFloatingDate(maxDate) : "—"}
        </p>
      </div>
    </header>
  );
}