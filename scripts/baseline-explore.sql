-- 0) Verifica che ogni stazione abbia al massimo
-- un sensore per ciascun inquinante canonico.
SELECT
    st.id AS station_id,
    st.name AS station_name,
    st.municipality,
    s."pollutantName",
    COUNT(*) AS sensor_count
FROM "Sensor" s
JOIN "Station" st
  ON s."stationId" = st.id
WHERE s."pollutantName" IN (
    'PM10 (SM2005)',
    'Particelle sospese PM2.5',
    'Biossido di Azoto',
    'Ozono'
)
GROUP BY
    st.id,
    st.name,
    st.municipality,
    s."pollutantName"
HAVING COUNT(*) > 1
ORDER BY
    s."pollutantName",
    st.municipality,
    st.id;
    
-- A) Milano PM10 (Marzo 2026)
SELECT 
    'Milano PM10' AS scenario,
    COUNT(*) AS row_count,
    COUNT(DISTINCT st.id) AS distinct_stations,
    TO_CHAR(MIN(m."recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS min_timestamp,
    TO_CHAR(MAX(m."recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS max_timestamp
FROM "Measurement" m
JOIN "Sensor" s ON m."sensorId" = s.id
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'PM10 (SM2005)'
  AND st.municipality = 'Milano'
  AND m.status = 'VA'
  AND m."recordedAt" >= '2026-03-01'::timestamp
  AND m."recordedAt" < '2026-04-01'::timestamp;

-- B) Monza O3 (Agosto 2026)
SELECT 
    'Monza O3' AS scenario,
    COUNT(*) AS row_count,
    COUNT(DISTINCT st.id) AS distinct_stations,
    TO_CHAR(MIN(m."recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS min_timestamp,
    TO_CHAR(MAX(m."recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS max_timestamp
FROM "Measurement" m
JOIN "Sensor" s ON m."sensorId" = s.id
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'Ozono'
  AND st.municipality = 'Monza'
  AND m.status = 'VA'
  AND m."recordedAt" >= '2026-08-01'::timestamp
  AND m."recordedAt" < '2026-09-01'::timestamp;

-- C) Atlantide PM10 (Marzo 2026)
SELECT 
    'Atlantide PM10' AS scenario,
    COUNT(*) AS row_count,
    COUNT(DISTINCT st.id) AS distinct_stations,
    TO_CHAR(MIN(m."recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS min_timestamp,
    TO_CHAR(MAX(m."recordedAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS max_timestamp
FROM "Measurement" m
JOIN "Sensor" s ON m."sensorId" = s.id
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'PM10 (SM2005)'
  AND st.municipality = 'Atlantide'
  AND m.status = 'VA'
  AND m."recordedAt" >= '2026-03-01'::timestamp
  AND m."recordedAt" < '2026-04-01'::timestamp;