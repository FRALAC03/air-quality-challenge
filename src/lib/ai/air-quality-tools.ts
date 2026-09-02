import {
  AirQualityService,
} from "../domain/air-quality.service";

import type {
  GetThresholdToolInput,
  GetPeriodAverageToolInput,
  ComparePeriodsToolInput,
  GetExceedancesToolInput,
  ExploreDataToolInput,
} from "./tool-types";

export async function executeGetThreshold(
  input: GetThresholdToolInput,
) {
  return AirQualityService.getThresholdRule(
    input.pollutant,
  );
}

export async function executeGetPeriodAverage(
  input: GetPeriodAverageToolInput,
) {
  return AirQualityService.getPeriodAverage(
    input.pollutant,
    input.period,
    input.municipality,
  );
}

export async function executeComparePeriods(
  input: ComparePeriodsToolInput,
) {
  return AirQualityService.comparePeriods(
    input.pollutant,
    input.period1,
    input.period2,
    input.municipality,
  );
}

export async function executeGetExceedances(
  input: GetExceedancesToolInput,
) {
  return AirQualityService.getExceedances(
    input.pollutant,
    input.period,
    input.metric,
    input.municipality,
  );
}

export async function executeExploreData(
  input: ExploreDataToolInput,
) {
  return AirQualityService.getExploreData(
    input.pollutant,
    input.municipality,
    input.period,
  );
}

export async function executeListMunicipalities() {
  return AirQualityService.getMunicipalities();
}