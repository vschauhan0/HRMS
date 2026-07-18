import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create Companies
  const nidhiImpex = await prisma.company.upsert({
    where: { code: 'NI' },
    update: { themeColor: '#0d9488' },
    create: { name: 'Nidhi Impex', code: 'NI', themeColor: '#0d9488', status: true },
  });

  const silverStar = await prisma.company.upsert({
    where: { code: 'SS' },
    update: { themeColor: '#d97706' },
    create: { name: 'Silver Star', code: 'SS', themeColor: '#d97706', status: true },
  });

  console.log('✅ Companies created');

  // Create Branches
  const shreeji = await prisma.branch.upsert({
    where: { companyId_code: { companyId: nidhiImpex.id, code: 'SHR' } },
    update: {},
    create: { companyId: nidhiImpex.id, name: 'Shreeji', code: 'SHR', status: true },
  });

  const ichhaporeNI = await prisma.branch.upsert({
    where: { companyId_code: { companyId: nidhiImpex.id, code: 'ICH' } },
    update: {},
    create: { companyId: nidhiImpex.id, name: 'Ichhapore', code: 'ICH', status: true },
  });

  const daduk = await prisma.branch.upsert({
    where: { companyId_code: { companyId: silverStar.id, code: 'DAD' } },
    update: {},
    create: { companyId: silverStar.id, name: 'Daduk', code: 'DAD', status: true },
  });

  const ichhaporeSS = await prisma.branch.upsert({
    where: { companyId_code: { companyId: silverStar.id, code: 'ICH' } },
    update: {},
    create: { companyId: silverStar.id, name: 'Ichhapore', code: 'ICH', status: true },
  });

  console.log('✅ Branches created');

  // Create Super Admin
  const superAdminPassword = await hashPassword('Admin@123');
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@salaryportal.com' },
    update: {},
    create: {
      email: 'superadmin@salaryportal.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Super Admin created (superadmin@salaryportal.com / Admin@123)');

  // Create Company Admin for Nidhi Impex
  const adminPassword = await hashPassword('Admin@123');
  const adminUserNI = await prisma.user.upsert({
    where: { email: 'admin@nidhiimpex.com' },
    update: {},
    create: {
      email: 'admin@nidhiimpex.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.adminProfile.upsert({
    where: { userId: adminUserNI.id },
    update: {},
    create: {
      userId: adminUserNI.id,
      companyId: nidhiImpex.id,
      name: 'Nidhi Impex Admin',
      mobile: '9876543210',
    },
  });

  console.log('✅ Nidhi Impex Admin created (admin@nidhiimpex.com / Admin@123)');

  // Create Company Admin for Silver Star
  const adminUserSS = await prisma.user.upsert({
    where: { email: 'admin@silverstar.com' },
    update: {},
    create: {
      email: 'admin@silverstar.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.adminProfile.upsert({
    where: { userId: adminUserSS.id },
    update: {},
    create: {
      userId: adminUserSS.id,
      companyId: silverStar.id,
      name: 'Silver Star Admin',
      mobile: '9876543211',
    },
  });

  console.log('✅ Silver Star Admin created (admin@silverstar.com / Admin@123)');

  // Create sample employees for Nidhi Impex
  const employees = [
    { firstName: 'Rajesh', lastName: 'Patel', email: 'rajesh@nidhiimpex.com', mobile: '9898123401', branch: shreeji, dept: 'Accounts', desig: 'Accountant', pan: 'ABCPD1234F' },
    { firstName: 'Priya', lastName: 'Shah', email: 'priya@nidhiimpex.com', mobile: '9898123402', branch: shreeji, dept: 'HR', desig: 'HR Executive', pan: 'DEFPS5678G' },
    { firstName: 'Amit', lastName: 'Kumar', email: 'amit@nidhiimpex.com', mobile: '9898123403', branch: ichhaporeNI, dept: 'Operations', desig: 'Manager', pan: 'GHIAK9012H' },
    { firstName: 'Sneha', lastName: 'Mehta', email: 'sneha@nidhiimpex.com', mobile: '9898123404', branch: ichhaporeNI, dept: 'Finance', desig: 'Finance Analyst', pan: 'JKLSM3456I' },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram@nidhiimpex.com', mobile: '9898123405', branch: shreeji, dept: 'IT', desig: 'Developer', pan: 'MNOPS7890J' },
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const empCode = `NI-${emp.branch.code}-${1001 + i}`;
    const joinDate = new Date(2023, Math.floor(i * 1.5), 15);

    const employee = await prisma.employee.upsert({
      where: { employeeCode: empCode },
      update: {},
      create: {
        companyId: nidhiImpex.id,
        branchId: emp.branch.id,
        employeeCode: empCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        mobile: emp.mobile,
        pan: emp.pan,
        joiningDate: joinDate,
        department: emp.dept,
        designation: emp.desig,
        status: 'ACTIVE',
      },
    });

    // Create user account for first 3 employees
    if (i < 3) {
      const empPassword = await hashPassword('Employee@123');
      await prisma.user.upsert({
        where: { email: emp.email },
        update: {},
        create: {
          email: emp.email,
          password: empPassword,
          role: 'EMPLOYEE',
          employeeId: employee.id,
        },
      });
    }

    // Create bank details
    await prisma.employeeBankDetail.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        bankName: 'State Bank of India',
        accountNumber: `1234567890${i}`,
        ifsc: 'SBIN0001234',
        accountHolder: `${emp.firstName} ${emp.lastName}`,
      },
    });

  }

  // Create salary slips for last 3 months (separate loop to create batches first)
  const batchMap: Record<string, string> = {};
  for (let m = 0; m < 3; m++) {
    const month = new Date().getMonth() - m;
    const year = new Date().getFullYear();
    const actualMonth = month <= 0 ? 12 + month : month;
    const actualYear = month <= 0 ? year - 1 : year;
    const key = `${actualMonth}-${actualYear}`;

    if (!batchMap[key]) {
      const batch = await prisma.salaryBatch.create({
        data: {
          companyId: nidhiImpex.id,
          branchId: shreeji.id,
          month: actualMonth,
          year: actualYear,
          uploadedBy: superAdminUser.id,
          fileName: 'seed-import.xlsx',
          importedRecords: 5,
        },
      });
      batchMap[key] = batch.id;
    }
  }

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const empCode = `NI-${emp.branch.code}-${1001 + i}`;
    const employee = await prisma.employee.findUnique({ where: { employeeCode: empCode } });
    if (!employee) continue;

    for (let m = 0; m < 3; m++) {
      const month = new Date().getMonth() - m;
      const year = new Date().getFullYear();
      const actualMonth = month <= 0 ? 12 + month : month;
      const actualYear = month <= 0 ? year - 1 : year;

      const grossSalary = 35000 + i * 5000;
      const basicSalary = grossSalary * 0.5;
      const hra = grossSalary * 0.2;
      const da = grossSalary * 0.1;
      const pf = basicSalary * 0.12;
      const tds = 1500 + i * 200;
      const totalDeduction = pf + tds + 200;
      const netSalary = grossSalary - totalDeduction;

      await prisma.salarySlip.upsert({
        where: { employeeId_month_year: { employeeId: employee.id, month: actualMonth, year: actualYear } },
        update: {},
        create: {
          batchId: batchMap[`${actualMonth}-${actualYear}`],
          employeeId: employee.id,
          month: actualMonth,
          year: actualYear,
          grossSalary,
          totalDeduction,
          netSalary,
          basicSalary,
          hra,
          da,
          conveyance: 1600,
          medical: 1250,
          specialAllow: grossSalary - basicSalary - hra - da - 1600 - 1250,
          pf,
          tds,
          professionalTax: 200,
        },
      });
    }
  }

  console.log('✅ Sample employees created with salary slips');

  // Create some pending employees
  const pendingEmployees = [
    { firstName: 'Neha', lastName: 'Gupta', email: 'neha@nidhiimpex.com', mobile: '9898123410', branch: ichhaporeNI },
    { firstName: 'Rohit', lastName: 'Jain', email: 'rohit@silverstar.com', mobile: '9898123411', branch: daduk },
  ];

  for (let i = 0; i < pendingEmployees.length; i++) {
    const emp = pendingEmployees[i];
    const company = i === 0 ? nidhiImpex : silverStar;
    const empCode = `${company.code}-${emp.branch.code}-${2001 + i}`;
    await prisma.employee.upsert({
      where: { employeeCode: empCode },
      update: {},
      create: {
        companyId: company.id,
        branchId: emp.branch.id,
        employeeCode: empCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        mobile: emp.mobile,
        joiningDate: new Date(),
        department: 'General',
        designation: 'Staff',
        status: 'PENDING',
      },
    });
  }

  console.log('✅ Pending employees created');

  // Create some appointment forms
  await prisma.appointmentForm.upsert({
    where: { applicationNo: 'APP-DEMO-001' },
    update: {},
    create: {
      applicationNo: 'APP-DEMO-001',
      fullName: 'Arjun Patel',
      email: 'arjun@example.com',
      mobile: '9898123456',
      companyId: nidhiImpex.id,
      branchId: shreeji.id,
      status: 'PENDING',
    },
  });

  await prisma.appointmentForm.upsert({
    where: { applicationNo: 'APP-DEMO-002' },
    update: {},
    create: {
      applicationNo: 'APP-DEMO-002',
      fullName: 'Meera Sharma',
      email: 'meera@example.com',
      mobile: '9898123457',
      companyId: silverStar.id,
      branchId: daduk.id,
      status: 'PENDING',
    },
  });

  console.log('✅ Sample appointment forms created');

  // Create Form16 for first employee
  const rajesh = await prisma.employee.findFirst({ where: { employeeCode: 'NI-SHR-1001' } });
  if (rajesh) {
    await prisma.form16Document.upsert({
      where: { employeeId_financialYear: { employeeId: rajesh.id, financialYear: '2023-24' } },
      update: {},
      create: {
        employeeId: rajesh.id,
        financialYear: '2023-24',
        filePath: '/uploads/form16/sample-2023-24.pdf',
        uploadedBy: superAdminUser.id,
      },
    });
  }

  console.log('✅ Sample Form16 created');

  // Create default settings
  await prisma.settings.upsert({
    where: { key: 'notification_registration' },
    update: {},
    create: { key: 'notification_registration', value: 'true' },
  });
  await prisma.settings.upsert({
    where: { key: 'notification_salary' },
    update: {},
    create: { key: 'notification_salary', value: 'true' },
  });
  await prisma.settings.upsert({
    where: { key: 'notification_form16' },
    update: {},
    create: { key: 'notification_form16', value: 'true' },
  });

  console.log('✅ Settings created');
  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📊 Login Credentials:');
  console.log('   Super Admin: superadmin@salaryportal.com / Admin@123');
  console.log('   NI Admin:    admin@nidhiimpex.com / Admin@123');
  console.log('   SS Admin:    admin@silverstar.com / Admin@123');
  console.log('   Employee:    rajesh@nidhiimpex.com / Employee@123');
  console.log('   Employee:    priya@nidhiimpex.com / Employee@123');
  console.log('   Employee:    amit@nidhiimpex.com / Employee@123');
  console.log('   Pending:     neha@nidhiimpex.com (needs registration)');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });