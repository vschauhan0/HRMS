import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getAuthUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  const payload = verifyToken(token) as { id: string } | null;
  if (!payload) return null;
  return db.user.findUnique({ where: { id: (payload as any).id } });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.notification.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { userId, title, message, type, link } = body;

    if (!userId || !title || !message) {
      return NextResponse.json({ success: false, message: 'userId, title, message required' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: { userId, title, message, type: type || 'INFO', link: link || null },
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    await db.notification.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, message: 'All notifications cleared' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}