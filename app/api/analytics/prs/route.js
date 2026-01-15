import { getRecentPRsAction } from '@/actions/analyticsActions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get('gymId');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!gymId) {
    return Response.json({ error: 'Missing gymId' }, { status: 400 });
  }

  const result = await getRecentPRsAction(gymId, limit);
  return Response.json(result);
}
