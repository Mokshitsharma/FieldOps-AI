import 'dotenv/config';
import { connectDatabase } from '../config/database';
import { setupAssociations, Admin } from '../models';
import { logger } from '../utils/logger';

const seedAdmin = async () => {
  await connectDatabase();
  setupAssociations();
  await require('sequelize').default;

  const existing = await Admin.findOne({ where: { email: process.env.ADMIN_EMAIL || 'admin@movigoinnovations.com' } });
  if (existing) {
    logger.info('Admin already exists. Skipping seed.');
    process.exit(0);
  }

  const admin = await Admin.create({
    name: process.env.ADMIN_NAME || 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@movigoinnovations.com',
    password: process.env.ADMIN_PASSWORD || 'Movigo@2024',
    role: 'superadmin',
    isActive: true,
  });

  logger.info(`✅ Admin created:`);
  logger.info(`   Email: ${admin.email}`);
  logger.info(`   Password: ${process.env.ADMIN_PASSWORD || 'Movigo@2024'}`);
  logger.info(`   ⚠️  Change this password immediately after first login!`);
  process.exit(0);
};

seedAdmin().catch(err => { logger.error(err); process.exit(1); });
