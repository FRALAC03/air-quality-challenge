import csv
import sys
import os
import urllib.parse
from pathlib import Path
from datetime import datetime
import psycopg
from dotenv import load_dotenv

# COSTANTI E ASSUNZIONI
BATCH_SIZE = 5000

# Valori attesi per garantire che il dataset non sia stato alterato post-analisi.
AUDIT_EXPECTATIONS = {
    "station_csv_rows": 45,
    "measurement_csv_rows": 118856,
    "unique_stations": 19,
    "unique_sensors": 45,
    "exact_duplicates": 12,
    "unique_measurements": 118844,
}

def get_psycopg_database_url(env_path: Path) -> str:
    """Reads DATABASE_URL from .env (without override) and removes '?schema=public' safely for psycopg."""
    load_dotenv(env_path)
    raw_url = os.getenv("DATABASE_URL")
    
    if not raw_url:
        raise RuntimeError(f"DATABASE_URL environment variable is missing in {env_path} or system.")
        
    parsed = urllib.parse.urlparse(raw_url)
    query_params = urllib.parse.parse_qs(parsed.query)
    query_params.pop("schema", None)
    
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    new_url_parts = list(parsed)
    new_url_parts[4] = new_query 
    
    return urllib.parse.urlunparse(new_url_parts)

def parse_source_timestamp(date_str: str) -> datetime:
    """Parses timestamp keeping it naive. Fails if timezone info is suddenly present."""
    raw = date_str.strip()
    
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(
            f"Invalid timestamp format: {date_str}"
        ) from exc

    if dt.tzinfo is not None:
        raise ValueError(
            f"Unexpected timezone-aware timestamp: {date_str}"
        )

    return dt

def parse_optional_float(val: str, field_name: str) -> float | None:
    if not val or val.strip() == '':
        return None
    try:
        return float(val)
    except ValueError:
        raise ValueError(f"Invalid optional float for {field_name}: {val}")

def parse_required_float(val: str, field_name: str) -> float:
    if not val or val.strip() == '':
        raise ValueError(f"Missing required float for {field_name}")
    try:
        return float(val)
    except ValueError:
        raise ValueError(f"Invalid required float for {field_name}: {val}")

def ingest_data():
    project_root = Path(__file__).resolve().parent.parent
    env_path = project_root / ".env"
    stations_path = project_root / 'data' / 'stations.csv'
    measurements_path = project_root / 'data' / 'measurements.csv'
    
    if not stations_path.exists() or not measurements_path.exists():
        raise RuntimeError(f"Missing CSV files. Ensure they exist at:\n{stations_path}\n{measurements_path}")
        
    db_url = get_psycopg_database_url(env_path)
    
    stations_data = {}
    sensors_data = {}
    
    # --- PARSE STATIONS ---
    stations_rows = 0
    with open(stations_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        required_headers = {'idsensore', 'nometiposensore', 'unitamisura', 'idstazione', 'nomestazione', 'provincia', 'comune', 'lat', 'lng'}
        
        if not required_headers.issubset(set(reader.fieldnames or [])):
            raise RuntimeError(f"Missing required headers in stations.csv. Found: {reader.fieldnames}")
            
        for row in reader:
            stations_rows += 1
            station_id = int(row['idstazione'])
            sensor_id = int(row['idsensore'])
            
            st_dict = {
                'id': station_id,
                'name': row['nomestazione'].strip(),
                'municipality': row['comune'].strip(),
                'province': row['provincia'].strip(),
                'latitude': parse_optional_float(row['lat'], 'lat'),
                'longitude': parse_optional_float(row['lng'], 'lng')
            }
            
            if station_id in stations_data and stations_data[station_id] != st_dict:
                raise RuntimeError(f"Source metadata conflict for Station {station_id}.")
            stations_data[station_id] = st_dict
                
            sens_dict = {
                'id': sensor_id,
                'pollutantName': row['nometiposensore'].strip(),
                'unit': row['unitamisura'].strip(),
                'stationId': station_id
            }
            
            if sensor_id in sensors_data and sensors_data[sensor_id] != sens_dict:
                raise RuntimeError(f"Source metadata conflict for Sensor {sensor_id}.")
            sensors_data[sensor_id] = sens_dict
                
    # --- PARSE MEASUREMENTS ---
    meas_rows = 0
    unique_measurements = []
    measurement_keys = {}
    exact_duplicates = 0
    conflicting_duplicates = 0
    
    with open(measurements_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        required_headers = {'idsensore', 'data', 'valore', 'stato'}
        if not required_headers.issubset(set(reader.fieldnames or [])):
            raise RuntimeError("Missing required headers in measurements.csv.")
            
        for row in reader:
            meas_rows += 1
            sensor_id = int(row['idsensore'])
            
            if sensor_id not in sensors_data:
                raise RuntimeError(f"Unknown sensor ID {sensor_id} in measurements.csv at row {meas_rows}.")
                
            recorded_at = parse_source_timestamp(row['data'])
            value = parse_required_float(row['valore'], 'valore')
            status = row['stato'].strip()
            
            if status not in ('VA', 'NA'):
                raise ValueError(f"Invalid status '{status}' at row {meas_rows}.")
                
            key = (sensor_id, recorded_at)
            
            if key in measurement_keys:
                existing_val, existing_stat = measurement_keys[key]
                if existing_val == value and existing_stat == status:
                    exact_duplicates += 1
                    continue
                else:
                    conflicting_duplicates += 1
                    raise RuntimeError(f"REAL DATA CONFLICT at sensor {sensor_id}, time {recorded_at}. Existing: {existing_val}/{existing_stat}, New: {value}/{status}")
            
            measurement_keys[key] = (value, status)
            unique_measurements.append((sensor_id, recorded_at, value, status))

    # --- AUDIT SANITY CHECK ---
    if stations_rows != AUDIT_EXPECTATIONS["station_csv_rows"]:
        raise RuntimeError(f"Audit failure: expected {AUDIT_EXPECTATIONS['station_csv_rows']} station rows, found {stations_rows}")
    if meas_rows != AUDIT_EXPECTATIONS["measurement_csv_rows"]:
        raise RuntimeError(f"Audit failure: expected {AUDIT_EXPECTATIONS['measurement_csv_rows']} measurement rows, found {meas_rows}")
    if len(stations_data) != AUDIT_EXPECTATIONS["unique_stations"]:
        raise RuntimeError(f"Audit failure: expected {AUDIT_EXPECTATIONS['unique_stations']} unique stations, found {len(stations_data)}")
    if len(sensors_data) != AUDIT_EXPECTATIONS["unique_sensors"]:
        raise RuntimeError(f"Audit failure: expected {AUDIT_EXPECTATIONS['unique_sensors']} unique sensors, found {len(sensors_data)}")
    if exact_duplicates != AUDIT_EXPECTATIONS["exact_duplicates"]:
        raise RuntimeError(f"Audit failure: expected {AUDIT_EXPECTATIONS['exact_duplicates']} exact duplicates, found {exact_duplicates}")
    if len(unique_measurements) != AUDIT_EXPECTATIONS["unique_measurements"]:
        raise RuntimeError(f"Audit failure: expected {AUDIT_EXPECTATIONS['unique_measurements']} unique measurements, found {len(unique_measurements)}")

    # --- EXPECTATIONS FOR DB VERIFICATION ---
    expected_stations = len(stations_data)
    expected_sensors = len(sensors_data)
    expected_measurements = len(unique_measurements)
    expected_va = sum(1 for m in unique_measurements if m[3] == 'VA')
    expected_na = sum(1 for m in unique_measurements if m[3] == 'NA')
    expected_min_date = min(m[1] for m in unique_measurements)
    expected_max_date = max(m[1] for m in unique_measurements)

    # --- DATABASE TRANSACTION ---
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            
            # 1. DB Conflict Validation (Pre-Check)
            cur.execute('SELECT id, name, municipality, province, latitude, longitude FROM "Station"')
            for row in cur.fetchall():
                db_st = {'id': row[0], 'name': row[1], 'municipality': row[2], 'province': row[3], 'latitude': row[4], 'longitude': row[5]}
                if row[0] in stations_data and stations_data[row[0]] != db_st:
                    raise RuntimeError(f"DB Conflict: Station {row[0]} differs in DB.")
            
            cur.execute('SELECT id, "pollutantName", unit, "stationId" FROM "Sensor"')
            for row in cur.fetchall():
                db_sens = {'id': row[0], 'pollutantName': row[1], 'unit': row[2], 'stationId': row[3]}
                if row[0] in sensors_data and sensors_data[row[0]] != db_sens:
                    raise RuntimeError(f"DB Conflict: Sensor {row[0]} differs in DB.")
            
            # 2. Insert Stations & Sensors (DO NOTHING)
            for st in stations_data.values():
                cur.execute("""
                    INSERT INTO "Station" (id, name, municipality, province, latitude, longitude)
                    VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING
                """, (st['id'], st['name'], st['municipality'], st['province'], st['latitude'], st['longitude']))
            
            for sens in sensors_data.values():
                cur.execute("""
                    INSERT INTO "Sensor" (id, "pollutantName", unit, "stationId")
                    VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING
                """, (sens['id'], sens['pollutantName'], sens['unit'], sens['stationId']))
            
            # 3. Insert Measurements in Explicit Batches
            insert_query = """
                INSERT INTO "Measurement" ("sensorId", "recordedAt", value, status)
                VALUES (%s, %s, %s, %s) ON CONFLICT ("sensorId", "recordedAt") DO NOTHING
            """
            for i in range(0, expected_measurements, BATCH_SIZE):
                batch = unique_measurements[i:i + BATCH_SIZE]
                cur.executemany(insert_query, batch)
            
            # 4. DB Conflict Validation for Measurements
            cur.execute('SELECT "sensorId", "recordedAt", value, status FROM "Measurement"')
            db_meas_dict = {(row[0], row[1]): (row[2], row[3]) for row in cur.fetchall()}
            
            for mem_key, mem_val in measurement_keys.items():
                if mem_key in db_meas_dict:
                    if db_meas_dict[mem_key] != mem_val:
                         raise RuntimeError(f"DB Conflict: Measurement {mem_key} differs in DB. Expected {mem_val}, got {db_meas_dict[mem_key]}")

            # 5. Database Verification (Invariant Checks)
            cur.execute('SELECT COUNT(*) FROM "Station"')
            db_stations = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Sensor"')
            db_sensors = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "Measurement"')
            db_meas = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM \"Measurement\" WHERE status = 'VA'")
            db_va = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM \"Measurement\" WHERE status = 'NA'")
            db_na = cur.fetchone()[0]
            
            cur.execute('SELECT MIN("recordedAt"), MAX("recordedAt") FROM "Measurement"')
            min_date, max_date = cur.fetchone()
            
            if db_stations != expected_stations:
                raise RuntimeError(f"Verification failed: expected {expected_stations} stations, got {db_stations}")
            if db_sensors != expected_sensors:
                raise RuntimeError(f"Verification failed: expected {expected_sensors} sensors, got {db_sensors}")
            if db_meas != expected_measurements:
                raise RuntimeError(f"Verification failed: expected {expected_measurements} measurements, got {db_meas}")
            if db_va != expected_va:
                raise RuntimeError(f"Verification failed: expected {expected_va} VA, got {db_va}")
            if db_na != expected_na:
                raise RuntimeError(f"Verification failed: expected {expected_na} NA, got {db_na}")
            if min_date != expected_min_date:
                raise RuntimeError(f"Verification failed: expected min date {expected_min_date}, got {min_date}")
            if max_date != expected_max_date:
                raise RuntimeError(f"Verification failed: expected max date {expected_max_date}, got {max_date}")

    # --- REPORTING ---
    print("\n=== AIR QUALITY INGESTION REPORT ===")
    print("\nSOURCE")
    print("------")
    print(f"stations.csv rows: {stations_rows}")
    print(f"measurements.csv rows: {meas_rows}")
    print(f"exact duplicate rows: {exact_duplicates}")
    print(f"conflicting duplicate rows: {conflicting_duplicates}")
    
    print("\nPARSED (Expected)")
    print("-----------------")
    print(f"unique stations: {expected_stations}")
    print(f"unique sensors: {expected_sensors}")
    print(f"unique measurements: {expected_measurements}")
    
    print("\nDATABASE (Verified)")
    print("-------------------")
    print(f"stations: {db_stations}")
    print(f"sensors: {db_sensors}")
    print(f"measurements: {db_meas}")
    print(f"VA: {db_va}")
    print(f"NA: {db_na}")
    
    print("\nVERIFICATION")
    print("------------")
    print(f"Temporal coverage: {min_date.isoformat()} to {max_date.isoformat()}")
    print("Data Integrity: INVARIANTS PASSED")
    
    print("\nRESULT: SUCCESS")

def main():
    try:
        ingest_data()
    except Exception as e:
        print(f"\nRESULT: FAILED\nReason: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()