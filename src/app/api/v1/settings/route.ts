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
  return db.user.findUnique({
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

// GET - Get all settings as key-value pairs
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const settings = await db.settings.findMany();

    const allSettings: Record<string, string> = {};
    for (const s of settings) {
      allSettings[s.key] = s.value;
    }

    // Group into categories
    const companySettings: Record<string, string> = {};
    const notificationSettings: Record<string, string> = {};

    for (const [key, value] of Object.entries(allSettings)) {
      if (key.startsWith('company.')) {
        companySettings[key.replace('company.', '')] = value;
      } else if (key.startsWith('notification.')) {
        notificationSettings[key.replace('notification.', '')] = value;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        companySettings,
        notificationSettings,
        all: allSettings,
      },
    });
  } catch (error: any) {
    console.error('Settings get error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const settings = body.settings || body; // Support both { settings: {...} } and direct object

    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return NextResponse.json(
        { success: false, message: 'settings object is required' },
        { status: 400 }
      );
    }

    // Upsert each setting, flatten nested objects like notifications
    const flattenSettings = (obj: any, prefix = '') => {
      let flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && v !== null) {
          Object.assign(flat, flattenSettings(v, `${prefix}${k}.`));
        } else {
          flat[`${prefix}${k}`] = String(v);
        }
      }
      return flat;
    };

    const flatSettings = flattenSettings(settings);

    for (const [key, value] of Object.entries(flatSettings)) {
      await db.settings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    // Mark admin profile as completed if they save settings
    if (user.role === 'ADMIN' && user.adminProfile && !user.adminProfile.profileCompleted) {
      await db.adminProfile.update({
        where: { id: user.adminProfile.id },
        data: { profileCompleted: true },
      });
    }

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}