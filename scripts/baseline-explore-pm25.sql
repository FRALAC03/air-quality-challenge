WITH monthly_pm25 AS (
    SELECT
        st.municipality,
        DATE_TRUNC('month', m."recordedAt") AS month_start,
        COUNT(*) AS row_count,
        COUNT(DISTINCT st.id) AS distinct_stations,
        MIN(m."recordedAt") AS min_recorded_at,
        MAX(m."recordedAt") AS max_recorded_at
    FROM "Measurement" m
    JOIN "Sensor" s
      ON m."sensorId" = s.id
    JOIN "Station" st
      ON s."stationId" = st.id
    WHERE s."pollutantName" = 'Particelle sospese PM2.5'
      AND m.status = 'VA'
    GROUP BY
        st.municipality,
        DATE_TRUNC('month', m."recordedAt")
)
SELECT
    municipality,
    TO_CHAR(
        month_start,
        'YYYY-MM-DD"T"HH24:MI:SS'
    ) AS period_start,
    TO_CHAR(
        month_start + INTERVAL '1 month',
        'YYYY-MM-DD"T"HH24:MI:SS'
    ) AS period_end,
    row_count,
    distinct_stations,
    TO_CHAR(
        min_recorded_at,
        'YYYY-MM-DD"T"HH24:MI:SS.MS'
    ) AS min_timestamp,
    TO_CHAR(
        max_recorded_at,
        'YYYY-MM-DD"T"HH24:MI:SS.MS'
    ) AS max_timestamp
FROM monthly_pm25
ORDER BY
    row_count DESC,
    municipality ASC
LIMIT 5;