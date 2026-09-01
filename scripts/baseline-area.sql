WITH daily_station_avg AS (
    SELECT 
        s."pollutantName",
        st.id AS "stationId",
        DATE_TRUNC('day', m."recordedAt") AS day,
        AVG(m.value) AS "dailyAvg"
    FROM "Measurement" m
    JOIN "Sensor" s ON m."sensorId" = s.id
    JOIN "Station" st ON s."stationId" = st.id
    WHERE m.status = 'VA'
      AND m."recordedAt" >= '2026-08-13'::timestamp
      AND m."recordedAt" < '2026-08-27'::timestamp
    GROUP BY s."pollutantName", st.id, DATE_TRUNC('day', m."recordedAt")
),
daily_area_avg AS (
    SELECT 
        "pollutantName",
        day,
        AVG("dailyAvg") AS "dayAreaAvg"
    FROM daily_station_avg
    GROUP BY "pollutantName", day
),
period_classification AS (
    SELECT 
        "pollutantName",
        CASE 
            WHEN day >= '2026-08-20'::timestamp THEN 'CURRENT'
            ELSE 'PREVIOUS'
        END AS period_label,
        "dayAreaAvg"
    FROM daily_area_avg
)
SELECT 
    "pollutantName",
    period_label,
    AVG("dayAreaAvg") AS period_area_avg,
    COUNT(*) AS days_with_data
FROM period_classification
GROUP BY "pollutantName", period_label
ORDER BY "pollutantName", period_label;