import { AirQualityService }
  from "@/lib/domain/air-quality.service";
import { handleUnexpectedError }
  from "@/lib/api-utils";

export async function GET() {
  try {
    const result =
      await AirQualityService.getMunicipalities();

    return Response.json(
      result,
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleUnexpectedError(error);
  }
}