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

// GET - Employee profile
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Profile access denied' }, { status: 403 });
    }

    if (user.role === 'ADMIN') {
      if (!user.adminProfile?.id) {
        return NextResponse.json({ success: false, message: 'Admin profile not found' }, { status: 404 });
      }
      
      const adminProfile = await db.adminProfile.findUnique({
        where: { id: user.adminProfile.id },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      if (!adminProfile) {
        return NextResponse.json({ success: false, message: 'Admin profile not found' }, { status: 404 });
      }

      // Map to employee shape for the frontend
      const mappedAdmin = {
        ...adminProfile,
        firstName: adminProfile.name,
        lastName: '',
        email: user.email,
        bankDetail: {
          bankName: adminProfile.bankName,
          accountNumber: adminProfile.accountNumber,
          ifsc: adminProfile.ifsc,
          accountHolder: adminProfile.accountHolder,
        }
      };

      return NextResponse.json({ success: true, data: mappedAdmin });
    }

    if (!user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee profile not found' }, { status: 404 });
    }

    const employee = await db.employee.findUnique({
      where: { id: user.employeeId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        bankDetail: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Profile get error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update employee profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Profile access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email, mobile, address, pan, gender, city, pin, district, state,
      pfNo, esiNo, aadharNumber, uan, dob, joiningDate, department, designation,
      bankName, accountNumber, ifsc, accountHolder,
    } = body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (pan !== undefined) updateData.pan = pan?.trim() || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (pin !== undefined) updateData.pin = pin?.trim() || null;
    if (district !== undefined) updateData.district = district?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (pfNo !== undefined) updateData.pfNo = pfNo?.trim() || null;
    if (esiNo !== undefined) updateData.esiNo = esiNo?.trim() || null;
    if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber?.trim() || null;
    if (uan !== undefined) updateData.uan = uan?.trim() || null;
    if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
    if (joiningDate !== undefined) updateData.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (designation !== undefined) updateData.designation = designation?.trim() || null;

    // Handle bank details upsert
    if (bankName !== undefined || accountNumber !== undefined || ifsc !== undefined || accountHolder !== undefined) {
      (updateData as any).bankDetail = {
        upsert: {
          create: {
            bankName: bankName?.trim() || '',
            accountNumber: accountNumber?.trim() || '',
            ifsc: ifsc?.trim() || '',
            accountHolder: accountHolder?.trim() || '',
          },
          update: {
            ...(bankName !== undefined && { bankName: bankName.trim() }),
            ...(accountNumber !== undefined && { accountNumber: accountNumber.trim() }),
            ...(ifsc !== undefined && { ifsc: ifsc.trim() }),
            ...(accountHolder !== undefined && { accountHolder: accountHolder.trim() }),
          },
        },
      };
    }

    updateData.profileCompleted = true;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (user.role === 'ADMIN') {
      if (!user.adminProfile?.id) {
        return NextResponse.json({ success: false, message: 'Admin profile not found' }, { status: 404 });
      }

      // Map bank details directly into admin profile
      if (updateData.bankDetail?.upsert?.update) {
        const bd = updateData.bankDetail.upsert.update;
        if (bd.bankName !== undefined) updateData.bankName = bd.bankName;
        if (bd.accountNumber !== undefined) updateData.accountNumber = bd.accountNumber;
        if (bd.ifsc !== undefined) updateData.ifsc = bd.ifsc;
        if (bd.accountHolder !== undefined) updateData.accountHolder = bd.accountHolder;
      }
      delete updateData.bankDetail;
      
      // We don't update email here as it is tied to the user table directly
      // Or we can just ignore it for admin since it's user.email

      const updated = await db.adminProfile.update({
        where: { id: user.adminProfile.id },
        data: updateData,
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      const mappedAdmin = {
        ...updated,
        firstName: updated.name,
        lastName: '',
        email: user.email,
        bankDetail: {
          bankName: updated.bankName,
          accountNumber: updated.accountNumber,
          ifsc: updated.ifsc,
          accountHolder: updated.accountHolder,
        }
      };

      return NextResponse.json({ success: true, data: mappedAdmin, message: 'Profile updated' });
    }

    if (!user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee profile not found' }, { status: 404 });
    }

    const updated = await db.employee.update({
      where: { id: user.employeeId },
      data: updateData,
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        bankDetail: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Profile updated' });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}