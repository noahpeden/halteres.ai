// app/actions/workout-upload.js
'use server';

import { supabase } from '@/utils/supabase/server';
import mammoth from 'mammoth';
import pdf from 'pdf-parse/lib/pdf-parse';
import * as XLSX from 'xlsx';

const parseFile = async (file) => {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf') {
    const data = await pdf(buffer);
    console.log(data);
    return data.text;
  } else if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  } else if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return csv;
  }

  throw new Error('Unsupported file type');
};

const generateEmbedding = async (text) => {
  // Implement your embedding logic here.
  // For demonstration, let's assume we use a placeholder function.
  return Array(512).fill(Math.random()); // Example embedding of size 512
};

export async function handleWorkoutUpload(formData) {
  try {
    const file = formData.get('file');
    const userId = formData.get('userId');
    const fileName = formData.get('fileName');

    const fileContent = await parseFile(file);
    const embedding = await generateEmbedding(fileContent);

    const { data, error } = await supabase.from('internal_workouts').insert([
      {
        user_id: userId,
        file_name: fileName,
        content: fileContent,
        embedding,
      },
    ]);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'File uploaded and parsed successfully',
      data,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, message: error.message };
  }
}
