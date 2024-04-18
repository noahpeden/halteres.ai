import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.formData();
    const file = body.get('file');
    const userId = body.get('userId');
    const fileName = body.get('fileName');
    console.log(userId, fileName, file);
    if (!userId) {
      throw new Error('User ID is required');
    }

    const supabase = createClient();
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('External Workouts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        userId: userId,
      });
    console.log(data, error);
    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
