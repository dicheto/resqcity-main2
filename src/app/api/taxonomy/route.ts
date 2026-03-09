import { NextResponse } from 'next/server';
import { loadSignalRoutingTaxonomy } from '@/hooks/lib/taxonomy';

export async function GET() {
  try {
    const taxonomy = await loadSignalRoutingTaxonomy();
    return NextResponse.json(taxonomy);
  } catch (error) {
    console.error('Taxonomy fetch error:', error);
    return NextResponse.json({ error: 'Failed to load taxonomy' }, { status: 500 });
  }
}
