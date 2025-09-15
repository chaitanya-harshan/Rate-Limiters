import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/logs';

export async function GET() {
  const logs = getLogs();
  return NextResponse.json(logs);
}
