import { getParticipationStatsAction } from '@/app/actions/analyticsActions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get('gymId');
  const days = parseInt(searchParams.get('days') || '7');

  if (!gymId) {
    return Response.json({ error: 'Missing gymId' }, { status: 400 });
  }

  const result = await getParticipationStatsAction(gymId, days);
  return Response.json(result);
}
