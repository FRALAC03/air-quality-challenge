-- CreateEnum
CREATE TYPE "MeasurementStatus" AS ENUM ('VA', 'NA');

-- CreateTable
CREATE TABLE "Station" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" INTEGER NOT NULL,
    "pollutantName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" SERIAL NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "status" "MeasurementStatus" NOT NULL,
    "sensorId" INTEGER NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Station_municipality_idx" ON "Station"("municipality");

-- CreateIndex
CREATE INDEX "Sensor_stationId_idx" ON "Sensor"("stationId");

-- CreateIndex
CREATE INDEX "Sensor_pollutantName_idx" ON "Sensor"("pollutantName");

-- CreateIndex
CREATE INDEX "Measurement_recordedAt_idx" ON "Measurement"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_sensorId_recordedAt_key" ON "Measurement"("sensorId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
