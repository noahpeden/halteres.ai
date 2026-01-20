import { getProgramsForAnalyticsAction } from '@/actions/analyticsActions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get('gymId');

  if (!gymId) {
    return Response.json({ error: 'Missing gymId' }, { status: 400 });
  }

  const result = await getProgramsForAnalyticsAction(gymId);
  return Response.json(result);
}
