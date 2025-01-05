import { json } from '@sveltejs/kit';
import { parseReceipt } from '../../../backend';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const result = await parseReceipt(buffer);

    if (!result) {
      return json({ error: 'Failed to parse receipt' }, { status: 400 });
    }

    return json(result);
  } catch (error) {
    console.error('Error processing receipt:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
} 