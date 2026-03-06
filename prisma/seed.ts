import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Get all workspaces to seed data for each
  const workspaces = await prisma.workspace.findMany();

  if (workspaces.length === 0) {
    console.log('No workspaces found. Please create a user and workspace first.');
    return;
  }

  for (const workspace of workspaces) {
    console.log(`\nSeeding data for workspace: ${workspace.name} (${workspace.id})`);

    // Check if categories already exist for this workspace
    const existingCategories = await prisma.category.count({
      where: { workspaceId: workspace.id },
    });

    if (existingCategories > 0) {
      console.log(`Categories already exist for workspace ${workspace.name}, skipping...`);
    } else {
      // Seed Categories
      const categories = await prisma.category.createMany({
        data: [
          {
            workspaceId: workspace.id,
            name: 'Travel',
            description: 'Travel expenses including flights, hotels, and transportation',
            color: '#3B82F6',
            icon: 'plane',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Meals & Entertainment',
            description: 'Business meals, client dinners, and entertainment expenses',
            color: '#10B981',
            icon: 'utensils',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Office Supplies',
            description: 'Office equipment, stationery, and supplies',
            color: '#F59E0B',
            icon: 'briefcase',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Software & Subscriptions',
            description: 'Software licenses, SaaS subscriptions, and tools',
            color: '#8B5CF6',
            icon: 'laptop',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Marketing',
            description: 'Marketing campaigns, ads, and promotional materials',
            color: '#EC4899',
            icon: 'megaphone',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Training & Education',
            description: 'Courses, workshops, conferences, and professional development',
            color: '#14B8A6',
            icon: 'book',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Healthcare',
            description: 'Medical expenses and health insurance',
            color: '#EF4444',
            icon: 'heart',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Utilities',
            description: 'Internet, phone, electricity, and other utilities',
            color: '#6366F1',
            icon: 'zap',
            isActive: true,
          },
          {
            workspaceId: workspace.id,
            name: 'Miscellaneous',
            description: 'Other business expenses',
            color: '#64748B',
            icon: 'more-horizontal',
            isActive: true,
          },
        ],
      });
      console.log(`Created ${categories.count} categories`);
    }

    // Check if tags already exist for this workspace
    const existingTags = await prisma.tag.count({
      where: { workspaceId: workspace.id },
    });

    if (existingTags > 0) {
      console.log(`Tags already exist for workspace ${workspace.name}, skipping...`);
    } else {
      // Seed Tags
      const tags = await prisma.tag.createMany({
        data: [
          {
            workspaceId: workspace.id,
            name: 'Urgent',
            color: '#EF4444',
          },
          {
            workspaceId: workspace.id,
            name: 'Client',
            color: '#3B82F6',
          },
          {
            workspaceId: workspace.id,
            name: 'Recurring',
            color: '#8B5CF6',
          },
          {
            workspaceId: workspace.id,
            name: 'Project A',
            color: '#10B981',
          },
          {
            workspaceId: workspace.id,
            name: 'Project B',
            color: '#F59E0B',
          },
          {
            workspaceId: workspace.id,
            name: 'Team Event',
            color: '#EC4899',
          },
          {
            workspaceId: workspace.id,
            name: 'Refundable',
            color: '#14B8A6',
          },
        ],
      });
      console.log(`Created ${tags.count} tags`);
    }

    console.log(`Skipping expense policies (requires user ID for createdBy field)`);
    // Note: Expense policies can be created manually through the UI or via a separate admin script
    // as they require a createdBy user ID
  }

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
