import { getAthleteAnalyticsAction } from '@/actions/analyticsActions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get('athleteId');
  const gymId = searchParams.get('gymId');

  if (!athleteId) {
    return Response.json({ error: 'Missing athleteId' }, { status: 400 });
  }

  if (!gymId) {
    return Response.json({ error: 'Missing gymId' }, { status: 400 });
  }

  const result = await getAthleteAnalyticsAction(gymId, athleteId);
  return Response.json(result);
}
