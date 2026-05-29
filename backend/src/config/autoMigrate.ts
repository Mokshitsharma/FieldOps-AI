import sequelize from './database';
import { AppConfig, Zone } from '../models';
import { defaultConfig } from './defaultConfig';
import { logger } from '../utils/logger';

export const runMigration = async (): Promise<void> => {
  // Sync all models (creates/updates tables)
  await sequelize.sync({ alter: true });
  logger.info('✅ Database tables synced');

  // Seed default config
  for (const [key, value] of Object.entries(defaultConfig)) {
    await AppConfig.findOrCreate({
      where: { configKey: key },
      defaults: { configKey: key, configValue: JSON.stringify(value) },
    });
  }
  logger.info('✅ App config seeded');

  // Seed default zones
  const zones = [
    'Ranipura', 'Siyaganj', 'New Siyaganj', 'Dewas Naka', 'Palda',
    'Rajendra Nagar', 'Niranjanpur', 'Nipania', 'Rau', 'Vijay Nagar',
    'Scheme 54', 'Sukhliya', 'LIG Colony', 'Annapurna', 'Manglia',
    'Kanadiya', 'Aerodrome Area', 'Bhanwarkuan', 'Khajrana',
  ];
  for (const name of zones) {
    await Zone.findOrCreate({ where: { name, city: 'Indore' }, defaults: { name, city: 'Indore', isActive: true } });
  }
  logger.info('✅ Default zones seeded');
};
