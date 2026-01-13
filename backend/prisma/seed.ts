/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.salesData.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.message.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.chatGroup.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.sessionMentee.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // Create Admin User
  console.log('👤 Creating admin user...');
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      verified: true,
    },
  });

  // Create Mentor Users
  console.log('👨‍🏫 Creating mentor users...');
  const mentor1 = await prisma.user.create({
    data: {
      name: 'John Mentor',
      email: 'mentor1@example.com',
      passwordHash,
      role: 'MENTOR',
      status: 'ACTIVE',
      verified: true,
    },
  });

  const mentor2 = await prisma.user.create({
    data: {
      name: 'Jane Mentor',
      email: 'mentor2@example.com',
      passwordHash,
      role: 'MENTOR',
      status: 'ACTIVE',
      verified: true,
    },
  });

  const mentor3 = await prisma.user.create({
    data: {
      name: 'Bob Mentor',
      email: 'mentor3@example.com',
      passwordHash,
      role: 'MENTOR',
      status: 'PENDING_APPROVAL',
      verified: true,
    },
  });

  // Create Mentee Users
  console.log('👨‍🎓 Creating mentee users...');
  const mentee1 = await prisma.user.create({
    data: {
      name: 'Alice Mentee',
      email: 'mentee1@example.com',
      passwordHash,
      role: 'MENTEE',
      status: 'ACTIVE',
      verified: true,
    },
  });

  const mentee2 = await prisma.user.create({
    data: {
      name: 'Charlie Mentee',
      email: 'mentee2@example.com',
      passwordHash,
      role: 'MENTEE',
      status: 'ACTIVE',
      verified: true,
    },
  });

  const mentee3 = await prisma.user.create({
    data: {
      name: 'Diana Mentee',
      email: 'mentee3@example.com',
      passwordHash,
      role: 'MENTEE',
      status: 'PENDING_APPROVAL',
      verified: false,
    },
  });

  // Create Sessions
  console.log('📅 Creating sessions...');
  const session1 = await prisma.session.create({
    data: {
      title: 'Business Strategy Workshop',
      description: 'Learn how to develop a comprehensive business strategy',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      duration: 60,
      status: 'SCHEDULED',
      mentorId: mentor1.id,
    },
  });

  const session2 = await prisma.session.create({
    data: {
      title: 'Marketing Fundamentals',
      description: 'Introduction to digital marketing strategies',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      duration: 90,
      status: 'SCHEDULED',
      mentorId: mentor2.id,
    },
  });

  const session3 = await prisma.session.create({
    data: {
      title: 'Financial Planning Session',
      description: 'Understanding business finances and budgeting',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      duration: 45,
      status: 'COMPLETED',
      mentorId: mentor1.id,
    },
  });

  // Add mentees to sessions
  console.log('👥 Adding mentees to sessions...');
  await prisma.sessionMentee.create({
    data: {
      sessionId: session1.id,
      menteeId: mentee1.id,
    },
  });

  await prisma.sessionMentee.create({
    data: {
      sessionId: session1.id,
      menteeId: mentee2.id,
    },
  });

  await prisma.sessionMentee.create({
    data: {
      sessionId: session2.id,
      menteeId: mentee1.id,
    },
  });

  await prisma.sessionMentee.create({
    data: {
      sessionId: session3.id,
      menteeId: mentee1.id,
    },
  });

  await prisma.sessionMentee.create({
    data: {
      sessionId: session2.id,
      menteeId: mentee3.id,
    },
  });

  // Create Announcements
  console.log('📢 Creating announcements...');
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the Mentorship Platform',
      message: 'We are excited to have you join our mentorship community. Please explore the platform and reach out to mentors for guidance.',
      targetRole: 'MENTEE',
      createdBy: admin.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'New Mentorship Guidelines',
      message: 'Please review the updated mentorship guidelines. All mentors are expected to follow these guidelines for effective mentorship.',
      targetRole: 'MENTOR',
      createdBy: admin.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'Upcoming Workshop',
      message: 'Join us for an exclusive workshop on business development next week. Register now!',
      targetRole: 'MENTEE',
      createdBy: mentor1.id,
    },
  });

  // Create Resources
  console.log('📚 Creating resources...');
  await prisma.resource.create({
    data: {
      title: 'Business Plan Template',
      description: 'A comprehensive template for creating your business plan',
      category: 'Templates',
      fileUrl: '/uploads/business-plan-template.pdf',
      fileName: 'business-plan-template.pdf',
      fileSize: 1024000, // 1MB
      uploadedBy: mentor1.id,
    },
  });

  await prisma.resource.create({
    data: {
      title: 'Marketing Checklist',
      description: 'Essential marketing tasks for small businesses',
      category: 'Checklists',
      fileUrl: '/uploads/marketing-checklist.pdf',
      fileName: 'marketing-checklist.pdf',
      fileSize: 512000, // 500KB
      uploadedBy: mentor2.id,
    },
  });

  await prisma.resource.create({
    data: {
      title: 'Financial Planning Guide',
      description: 'Step-by-step guide to financial planning',
      category: 'Guides',
      fileUrl: '/uploads/financial-planning-guide.pdf',
      fileName: 'financial-planning-guide.pdf',
      fileSize: 2048000, // 2MB
      uploadedBy: mentor1.id,
    },
  });

  // Create Chat Groups
  console.log('💬 Creating chat groups...');
  const generalGroup = await prisma.chatGroup.create({
    data: {
      name: 'General Discussion',
      description: 'General discussion group for all members',
      isGeneral: true,
      // createdBy is null for general groups
    } as any,
  });

  const businessGroup = await prisma.chatGroup.create({
    data: {
      name: 'Business Development',
      description: 'Discussion group for business development topics',
      isGeneral: false,
      createdBy: mentor1.id, // Mentor created this group
    } as any,
  });

  const marketingGroup = await prisma.chatGroup.create({
    data: {
      name: 'Marketing Strategies',
      description: 'Group for discussing marketing strategies and campaigns',
      isGeneral: false,
      createdBy: admin.id, // Admin created this group
    } as any,
  });

  // Add members to groups
  console.log('👥 Adding members to chat groups...');
  await prisma.groupMember.createMany({
    data: [
      { groupId: generalGroup.id, userId: admin.id },
      { groupId: generalGroup.id, userId: mentor1.id },
      { groupId: generalGroup.id, userId: mentor2.id },
      { groupId: generalGroup.id, userId: mentee1.id },
      { groupId: generalGroup.id, userId: mentee2.id },
      { groupId: businessGroup.id, userId: mentor1.id },
      { groupId: businessGroup.id, userId: mentor3.id },
      { groupId: businessGroup.id, userId: mentee1.id },
      { groupId: businessGroup.id, userId: mentee2.id },
      { groupId: businessGroup.id, userId: mentee3.id },
      { groupId: marketingGroup.id, userId: admin.id },
      { groupId: marketingGroup.id, userId: mentor1.id },
      { groupId: marketingGroup.id, userId: mentor2.id },
      { groupId: marketingGroup.id, userId: mentee1.id },
    ],
  });

  // Create Messages
  console.log('💌 Creating messages...');
  await prisma.message.create({
    data: {
      content: 'Welcome everyone to the mentorship platform!',
      senderId: admin.id,
      groupId: generalGroup.id,
      // deletedAt is null by default (not deleted)
    } as any,
  });

  await prisma.message.create({
    data: {
      content: 'Thank you for the warm welcome!',
      senderId: mentee1.id,
      groupId: generalGroup.id,
    } as any,
  });

  await prisma.message.create({
    data: {
      content: 'Hello, I have a question about business planning.',
      senderId: mentee1.id,
      receiverId: mentor1.id,
    } as any,
  });

  await prisma.message.create({
    data: {
      content: 'I\'d be happy to help! What would you like to know?',
      senderId: mentor1.id,
      receiverId: mentee1.id,
    } as any,
  });

  await prisma.message.create({
    data: {
      content: 'Let\'s discuss business development strategies in this group.',
      senderId: mentor1.id,
      groupId: businessGroup.id,
    } as any,
  });

  await prisma.message.create({
    data: {
      content: 'Great idea! I\'m interested in learning more.',
      senderId: mentee1.id,
      groupId: businessGroup.id,
    } as any,
  });

  // Create Ratings
  console.log('⭐ Creating ratings...');
  await prisma.rating.create({
    data: {
      mentorId: mentor1.id,
      menteeId: mentee1.id,
      score: 5,
      comment: 'Excellent mentor! Very helpful and knowledgeable.',
    },
  });

  await prisma.rating.create({
    data: {
      mentorId: mentor1.id,
      menteeId: mentee2.id,
      score: 4,
      comment: 'Great session, learned a lot!',
    },
  });

  await prisma.rating.create({
    data: {
      mentorId: mentor2.id,
      menteeId: mentee1.id,
      score: 5,
      comment: 'Outstanding guidance and support.',
    },
  });

  // Create Sales Data
  console.log('📊 Creating sales data...');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Calculate months with proper year handling
  const month1 = currentMonth - 2 >= 1 ? currentMonth - 2 : 12;
  const year1 = currentMonth - 2 >= 1 ? currentYear : currentYear - 1;
  const month2 = currentMonth - 1 >= 1 ? currentMonth - 1 : 12;
  const year2 = currentMonth - 1 >= 1 ? currentYear : currentYear - 1;
  const month3 = currentMonth;
  const year3 = currentYear;

  // Note: Each user can only have one sales entry per month/year (unique constraint)
  // So we'll create entries for different months or combine categories into one entry
  await prisma.salesData.createMany({
    data: [
      {
        userId: mentee1.id,
        revenue: 5000.00,
        category: 'Product Sales',
        month: month1,
        year: year1,
      },
      {
        userId: mentee1.id,
        revenue: 7500.00,
        category: 'Service Sales',
        month: month2,
        year: year2,
      },
      {
        userId: mentee1.id,
        revenue: 10000.00,
        category: 'Product Sales',
        month: month3,
        year: year3,
      },
      {
        userId: mentee2.id,
        revenue: 3000.00,
        category: 'Service Sales',
        month: month2,
        year: year2,
      },
      {
        userId: mentee2.id,
        revenue: 4500.00,
        category: 'Product Sales',
        month: month3,
        year: year3,
      },
      {
        userId: mentee3.id,
        revenue: 2000.00,
        category: 'Service Sales',
        month: month3,
        year: year3,
      },
    ] as any,
  });

  // Create Notifications
  console.log('🔔 Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: mentee1.id,
        title: 'New Session Scheduled',
        message: 'You have been added to "Business Strategy Workshop" session.',
        type: 'info',
        read: false,
      },
      {
        userId: mentee1.id,
        title: 'Session Completed',
        message: 'Your session "Financial Planning Session" has been completed.',
        type: 'success',
        read: true,
      },
      {
        userId: mentor1.id,
        title: 'New Mentee Joined',
        message: 'Alice Mentee has joined your session.',
        type: 'info',
        read: false,
      },
      {
        userId: mentee2.id,
        title: 'Welcome!',
        message: 'Welcome to the mentorship platform!',
        type: 'success',
        read: false,
      },
      {
        userId: mentor2.id,
        title: 'New Rating Received',
        message: 'You received a 5-star rating from Alice Mentee.',
        type: 'success',
        read: false,
      },
      {
        userId: mentee3.id,
        title: 'Account Pending Approval',
        message: 'Your account is pending approval. Please wait for admin review.',
        type: 'warning',
        read: false,
      },
      {
        userId: mentor3.id,
        title: 'Account Pending Approval',
        message: 'Your mentor account is pending approval.',
        type: 'warning',
        read: false,
      },
    ],
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📝 Default login credentials:');
  console.log('   Admin: admin@example.com / password123');
  console.log('   Mentor: mentor1@example.com / password123');
  console.log('   Mentee: mentee1@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

