import { getProgramAnalyticsAction } from '@/actions/analyticsActions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const programId = searchParams.get('programId');
  const gymId = searchParams.get('gymId');

  if (!programId) {
    return Response.json({ error: 'Missing programId' }, { status: 400 });
  }

  if (!gymId) {
    return Response.json({ error: 'Missing gymId' }, { status: 400 });
  }

  const result = await getProgramAnalyticsAction(programId, gymId);
  return Response.json(result);
}
