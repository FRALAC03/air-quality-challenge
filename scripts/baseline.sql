\echo '================================================'
\echo '0A - PM10 sensors duplicated inside one station'
\echo '================================================'

SELECT
    st.id,
    st.name,
    st.municipality,
    COUNT(*) AS pm10_sensors
FROM "Sensor" s
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'PM10 (SM2005)'
GROUP BY st.id, st.name, st.municipality
HAVING COUNT(*) > 1;


\echo '==============================================='
\echo '0B - O3 sensors duplicated inside one station'
\echo '==============================================='

SELECT
    st.id,
    st.name,
    st.municipality,
    COUNT(*) AS ozone_sensors
FROM "Sensor" s
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'Ozono'
GROUP BY st.id, st.name, st.municipality
HAVING COUNT(*) > 1;


\echo '================================================'
\echo '1 - PM10 station exceedance events - Milano Mar'
\echo '================================================'

WITH daily_station_avg AS (
    SELECT
        st.id AS station_id,
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS daily_avg
    FROM "Measurement" m
    JOIN "Sensor" s ON m."sensorId" = s.id
    JOIN "Station" st ON s."stationId" = st.id
    WHERE s."pollutantName" = 'PM10 (SM2005)'
      AND st.municipality = 'Milano'
      AND m.status = 'VA'
      AND m."recordedAt" >= '2026-03-01'
      AND m."recordedAt" < '2026-04-01'
    GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
)
SELECT COUNT(*) AS station_exceedance_events
FROM daily_station_avg
WHERE daily_avg > 50;


\echo '===================================================='
\echo '2 - PM10 municipality exceedance days - Milano Mar'
\echo '===================================================='

WITH daily_station_avg AS (
    SELECT
        st.id AS station_id,
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS daily_avg
    FROM "Measurement" m
    JOIN "Sensor" s ON m."sensorId" = s.id
    JOIN "Station" st ON s."stationId" = st.id
    WHERE s."pollutantName" = 'PM10 (SM2005)'
      AND st.municipality = 'Milano'
      AND m.status = 'VA'
      AND m."recordedAt" >= '2026-03-01'
      AND m."recordedAt" < '2026-04-01'
    GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
    HAVING AVG(m.value) > 50
)
SELECT COUNT(DISTINCT day) AS municipality_exceedance_days
FROM daily_station_avg;


\echo '========================================='
\echo '3 - Municipalities with O3 exceedances'
\echo '========================================='

SELECT DISTINCT st.municipality
FROM "Measurement" m
JOIN "Sensor" s ON m."sensorId" = s.id
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'Ozono'
  AND m.status = 'VA'
  AND m.value > 180
  AND m."recordedAt" >= '2026-08-01'
  AND m."recordedAt" < '2026-09-01'
ORDER BY st.municipality;


\echo '=========================================='
\echo '4 - Municipality O3 exceedance HOURS'
\echo '=========================================='

SELECT
    st.municipality,
    COUNT(DISTINCT m."recordedAt") AS municipality_exceedance_hours
FROM "Measurement" m
JOIN "Sensor" s ON m."sensorId" = s.id
JOIN "Station" st ON s."stationId" = st.id
WHERE s."pollutantName" = 'Ozono'
  AND m.status = 'VA'
  AND m.value > 180
  AND m."recordedAt" >= '2026-08-01'
  AND m."recordedAt" < '2026-09-01'
GROUP BY st.municipality
ORDER BY municipality_exceedance_hours DESC, st.municipality;


\echo '===================================='
\echo '5A - Monza PM10 Mar-Apr period avg'
\echo '===================================='

WITH daily_station_avg AS (
    SELECT
        st.id AS station_id,
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS daily_avg
    FROM "Measurement" m
    JOIN "Sensor" s ON m."sensorId" = s.id
    JOIN "Station" st ON s."stationId" = st.id
    WHERE s."pollutantName" = 'PM10 (SM2005)'
      AND st.municipality = 'Monza'
      AND m.status = 'VA'
      AND m."recordedAt" >= '2026-03-01'
      AND m."recordedAt" < '2026-05-01'
    GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
),
daily_municipality_avg AS (
    SELECT
        day,
        AVG(daily_avg) AS city_daily_avg
    FROM daily_station_avg
    GROUP BY day
)
SELECT AVG(city_daily_avg) AS period_avg
FROM daily_municipality_avg;


\echo '===================================='
\echo '5B - Monza PM10 May-Jun period avg'
\echo '===================================='

WITH daily_station_avg AS (
    SELECT
        st.id AS station_id,
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS daily_avg
    FROM "Measurement" m
    JOIN "Sensor" s ON m."sensorId" = s.id
    JOIN "Station" st ON s."stationId" = st.id
    WHERE s."pollutantName" = 'PM10 (SM2005)'
      AND st.municipality = 'Monza'
      AND m.status = 'VA'
      AND m."recordedAt" >= '2026-05-01'
      AND m."recordedAt" < '2026-07-01'
    GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
),
daily_municipality_avg AS (
    SELECT
        day,
        AVG(daily_avg) AS city_daily_avg
    FROM daily_station_avg
    GROUP BY day
)
SELECT AVG(city_daily_avg) AS period_avg
FROM daily_municipality_avg;


\echo '========================='
\echo '6 - Temporal coverage'
\echo '========================='

SELECT
    MIN("recordedAt") AS first_record,
    MAX("recordedAt") AS last_record
FROM "Measurement";


\echo '========================================'
\echo '7 - Measurements by pollutant and status'
\echo '========================================'

SELECT
    s."pollutantName",
    m.status,
    COUNT(*) AS measurement_count
FROM "Measurement" m
JOIN "Sensor" s ON m."sensorId" = s.id
GROUP BY s."pollutantName", m.status
ORDER BY s."pollutantName", m.status;

\echo '================================================'
\echo '8 - Monza PM10 July: data present / zero exceed'
\echo '================================================'

WITH daily_station_avg AS (
    SELECT
        st.id AS station_id,
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS daily_avg
    FROM "Measurement" m
    JOIN "Sensor" s ON m."sensorId" = s.id
    JOIN "Station" st ON s."stationId" = st.id
    WHERE s."pollutantName" = 'PM10 (SM2005)'
      AND st.municipality = 'Monza'
      AND m.status = 'VA'
      AND m."recordedAt" >= '2026-07-01'
      AND m."recordedAt" < '2026-08-01'
    GROUP BY st.id, DATE_TRUNC('day', m."recordedAt")
)
SELECT
    COUNT(*) AS station_days_with_data,
    COUNT(*) FILTER (WHERE daily_avg > 50) AS station_exceedance_events,
    COUNT(DISTINCT day) FILTER (WHERE daily_avg > 50)
        AS municipality_exceedance_days
FROM daily_station_avg;