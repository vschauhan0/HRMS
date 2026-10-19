require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function main() {
  const email = 'parth.nidhiimpex.2@gmail.com'; 
  const otpRecord = await db.otpStore.findFirst({
    where: { purpose: 'REGISTRATION', verified: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('OTP:', otpRecord);

  if (!otpRecord) {
    console.log('No verified OTP found for testing.');
    return;
  }

  const employee = await db.employee.findFirst({
    where: { email: otpRecord.email, status: 'PENDING' },
    include: { company: true, branch: true },
  });
  console.log('Employee:', employee);

  if (!employee) {
    console.log('No pending employee found.');
    return;
  }

  try {
    const existingUser = await db.user.findFirst({
      where: { email: otpRecord.email }
    });
    console.log('Existing User by Email:', existingUser);
    
    if (existingUser) {
      console.log('User already exists. Cannot create.');
      return;
    }

    const hashedPassword = await bcrypt.hash('password123', 12);
    console.log('Creating user...');
    const user = await db.user.create({
      data: {
        email: otpRecord.email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        employeeId: employee.id,
      },
    });
    console.log('User created:', user.id);
  } catch (err) {
    console.error('ERROR CREATING USER:', err.message);
  }
}
main().finally(() => db.$disconnect());
