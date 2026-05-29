import 'dotenv/config';
import sequelize from '../config/database';
import {
  Admin, Employee, Zone, EmployeeZone, Attendance, LocationLog,
  DriverOnboarding, RetailerOnboarding, CallLog, PaymentCollection,
  DailyReport, PointsLedger, EmployeeOfMonth, Notice, Note,
  NoteRecipient, NoteReply, Warning, SalaryRecord, SalaryHistory,
  Target, LeaveRequest, ExpenseClaim, Notification, AppConfig,
  TeamworkBonus, AuditLog, setupAssociations,
} from '../models';
import { defaultConfig } from './defaultConfig';
import { logger } from '../utils/logger';

const migrate = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    setupAssociations();

    // Sync all models - creates tables if they don't exist
    await sequelize.sync({ alter: true });
    logger.info('✅ All tables created/updated');

    // Seed default app config
    for (const [key, value] of Object.entries(defaultConfig)) {
      await AppConfig.findOrCreate({
        where: { configKey: key },
        defaults: { configKey: key, configValue: JSON.stringify(value) },
      });
    }
    logger.info('✅ Default app config seeded');

    // Seed default zones (Indore areas)
    const defaultZones = [
      'Ranipura', 'Siyaganj', 'New Siyaganj', 'Dewas Naka',
      'Palda', 'Rajendra Nagar', 'Niranjanpur', 'Nipania', 'Rau',
      'Vijay Nagar', 'Scheme 54', 'Sukhliya', 'LIG', 'Annapurna',
      'Manglia', 'Kanadiya', 'Aerodrome', 'Bhanwarkuan', 'Khajrana',
    ];
    for (const zoneName of defaultZones) {
      await Zone.findOrCreate({
        where: { name: zoneName, city: 'Indore' },
        defaults: { name: zoneName, city: 'Indore', isActive: true },
      });
    }
    logger.info('✅ Default zones seeded');

    logger.info('🎉 Migration complete');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
