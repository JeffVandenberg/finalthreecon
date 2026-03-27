import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminEmail = 'admin@finalthreecon.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPassword,
        name: 'Admin User',
        role: 'admin'
      }
    });
    console.log('✅ Created admin user:', {
      email: admin.email,
      password: 'admin123',
      role: admin.role
    });
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // Create default staff user
  const staffEmail = 'staff@finalthreecon.com';
  const existingStaff = await prisma.user.findUnique({
    where: { email: staffEmail }
  });

  if (!existingStaff) {
    const staffPassword = await bcrypt.hash('staff123', 10);
    const staff = await prisma.user.create({
      data: {
        email: staffEmail,
        passwordHash: staffPassword,
        name: 'Staff User',
        role: 'staff'
      }
    });
    console.log('✅ Created staff user:', {
      email: staff.email,
      password: 'staff123',
      role: staff.role
    });
  } else {
    console.log('ℹ️  Staff user already exists');
  }

  // Create default regular user
  const userEmail = 'user@finalthreecon.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!existingUser) {
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: userPassword,
        name: 'Test User',
        role: 'user'
      }
    });
    console.log('✅ Created regular user:', {
      email: user.email,
      password: 'user123',
      role: user.role
    });
  } else {
    console.log('ℹ️  Regular user already exists');
  }

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Default Users:');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│ Role    │ Email                      │ Password  │');
  console.log('├──────────────────────────────────────────────────┤');
  console.log('│ Admin   │ admin@finalthreecon.com   │ admin123  │');
  console.log('│ Staff   │ staff@finalthreecon.com   │ staff123  │');
  console.log('│ User    │ user@finalthreecon.com    │ user123   │');
  console.log('└──────────────────────────────────────────────────┘');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
