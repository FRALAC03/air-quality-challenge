"use client";

import {
  useEffect,
  useState,
} from "react";

import { apiClient } from "@/lib/frontend/api-client";
import type {
  DashboardSummaryResult,
} from "@/lib/domain/air-quality.types";

import Header from "./Header";
import KpiGrid from "./KpiGrid";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import ExplorePanel from "./ExplorePanel";
import ChatPanel from "./ChatPanel";

interface DashboardBootstrapData {
  summary: DashboardSummaryResult;
  municipalities: string[];
}

/*
 * Funzione pura rispetto a React:
 * nessun setState.
 */
async function fetchDashboardBootstrap(): Promise<DashboardBootstrapData> {
  const [summary, municipalities] =
    await Promise.all([
      apiClient.getDashboardSummary(),
      apiClient.getMunicipalities(),
    ]);

  if (summary.status === "ERROR") {
    throw new Error(
      summary.error ||
        "Dashboard summary error",
    );
  }

  return {
    summary,
    municipalities,
  };
}

export default function DashboardClient() {
  const [dashboardData, setDashboardData] =
    useState<DashboardSummaryResult | null>(
      null,
    );

  const [municipalities, setMunicipalities] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchDashboardBootstrap()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setDashboardData(result.summary);
        setMunicipalities(
          result.municipalities,
        );
        setError(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Dashboard fetch error:",
          err,
        );

        setError(true);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry =
    async (): Promise<void> => {
      setIsLoading(true);
      setError(false);

      try {
        const result =
          await fetchDashboardBootstrap();

        setDashboardData(result.summary);
        setMunicipalities(
          result.municipalities,
        );
      } catch (err: unknown) {
        console.error(
          "Dashboard retry error:",
          err,
        );

        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        onRetry={() => {
          void handleRetry();
        }}
      />
    );
  }

  const maxDate =
    dashboardData?.maxDate ?? null;

  const isNoData =
    dashboardData?.status === "NO_DATA";

  return (
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <Header maxDate={maxDate} />

    {isNoData ? (
      <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-700">
          Nessun dato disponibile
        </h2>

        <p className="text-slate-500 mt-2">
          Il dataset ARPA non contiene rilevamenti per l&apos;area.
        </p>
      </div>
    ) : (
      <>
        <KpiGrid
          kpis={
            dashboardData?.kpis ||
            []
          }
        />

        <ExplorePanel
          municipalities={
            municipalities
          }
        />
      </>
    )}

    <ChatPanel />
  </div>
);
}