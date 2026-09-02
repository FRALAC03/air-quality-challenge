export default function LoadingState() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="h-8 w-64 bg-slate-200 rounded"></div>
          <div className="mt-2 h-4 w-48 bg-slate-100 rounded"></div>
        </div>
        <div className="sm:text-right">
          <div className="h-3 w-32 bg-slate-200 rounded sm:ml-auto"></div>
          <div className="mt-2 h-4 w-24 bg-slate-200 rounded sm:ml-auto"></div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 h-40 p-6 flex flex-col">
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
            <div className="mt-4 h-8 w-24 bg-slate-200 rounded"></div>
            <div className="mt-4 h-4 w-32 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}