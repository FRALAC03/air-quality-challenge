const AIR_QUALITY_SUBJECT_PATTERNS: readonly RegExp[] = [
  /\bpm10\b/i,
  /\bpm\s*2[.,]?\s*5\b/i,
  /\bpm25\b/i,
  /\bno2\b/i,
  /\bo3\b/i,
  /\bozono\b/i,
  /\barpa\b/i,
  /\bqualit[aà]\s+dell['’]?aria\b/i,
];

const DATA_REQUEST_PATTERNS: readonly RegExp[] = [
  /\bsoglia\b/i,
  /\blimit(?:e|i)\b/i,
  /\bmedia\b/i,
  /\bmedie\b/i,
  /\btrend\b/i,
  /\bconfront\w*/i,
  /\bsuperament\w*/i,
  /\bsforament\w*/i,
  /\bcompliance\b/i,
  /\bconform\w*/i,
  /\brispettat\w*/i,
  /\bmisurazion\w*/i,
  /\bvalore\b/i,
  /\bquanti?\s+(?:giorni|ore)\b/i,
];

const MUNICIPALITY_LIST_PATTERNS: readonly RegExp[] = [
  /\bquali\b.*\bcomuni\b.*\bdisponibil\w*/i,
  /\belenc\w*\b.*\bcomuni\b/i,
  /\blista\b.*\bcomuni\b/i,
  /\bcomuni\b.*\bdisponibil\w*/i,
];

export function doesThisQuestionRequireAtLeastOneTool(
  userMessage: string,
): boolean {
  const message = userMessage.trim();

  if (!message) {
    return false;
  }

  const asksMunicipalityList =
    MUNICIPALITY_LIST_PATTERNS.some(
      (pattern) => pattern.test(message),
    );

  if (asksMunicipalityList) {
    return true;
  }

  const mentionsAirQualitySubject =
    AIR_QUALITY_SUBJECT_PATTERNS.some(
      (pattern) => pattern.test(message),
    );

  if (!mentionsAirQualitySubject) {
    return false;
  }

  const asksForDatasetFact =
    DATA_REQUEST_PATTERNS.some(
      (pattern) => pattern.test(message),
    );

  return asksForDatasetFact;
}