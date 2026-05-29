import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cron from 'node-cron';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { setupAssociations } from './models';
import { logger } from './utils/logger';
import { runMigration } from './config/autoMigrate';

const PORT = parseInt(process.env.PORT || '5000', 10);

// ─── Startup validation ───────────────────────────────────────
const validateEnv = (): void => {
  const required = [
    { key: 'DB_HOST' }, { key: 'DB_NAME' }, { key: 'DB_USER' }, { key: 'DB_PASSWORD' },
    { key: 'JWT_ACCESS_SECRET', minLen: 32 },
    { key: 'JWT_REFRESH_SECRET', minLen: 32 },
  ];
  const errors: string[] = [];
  for (const { key, minLen } of required) {
    const val = process.env[key];
    if (!val) { errors.push(`Missing: ${key}`); continue; }
    if (minLen && val.length < minLen) errors.push(`${key} must be at least ${minLen} chars`);
  }
  if (errors.length > 0) {
    errors.forEach(e => logger.error(`ENV ERROR: ${e}`));
    process.exit(1);
  }
};

const bootstrap = async (): Promise<void> => {
  try {
    validateEnv();
    await connectDatabase();
    setupAssociations();
    await runMigration();

    const app = createApp();
    const httpServer = http.createServer(app);

    // ─── Socket.io ──────────────────────────────────────────
    const io = new SocketServer(httpServer, {
      cors: {
        origin: (process.env.CORS_ORIGIN || '').split(','),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    app.locals.io = io;

    io.on('connection', (socket) => {
      const token = socket.handshake.auth?.token;
      if (!token) { socket.disconnect(); return; }

      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as any;
        socket.join(`user:${decoded.id}`);

        if (decoded.role !== 'employee') {
          socket.join('admins');
        } else {
          socket.join('employees');
        }

        socket.on('join:admins', () => {
          if (decoded.role !== 'employee') socket.join('admins');
        });

        socket.on('disconnect', () => {
          logger.debug(`Socket disconnected: ${decoded.id}`);
        });

      } catch {
        socket.disconnect();
      }
    });

    // ─── Cron Jobs ───────────────────────────────────────────

    // Daily: Deduct points for missing daily reports (runs at 11 PM)
    cron.schedule('0 23 * * *', async () => {
      logger.info('Running missing report check...');
      try {
        const { Employee, DailyReport, AppConfig } = await import('./models');
        const { awardPoints, POINT_ACTIONS } = await import('./utils/pointsEngine');

        const today = new Date().toISOString().split('T')[0];
        const employees = await Employee.findAll({ where: { isActive: true }, attributes: ['id'] });

        for (const emp of employees) {
          // Check if employee submitted today's report
          const report = await DailyReport.findOne({ where: { employeeId: emp.id, reportDate: today } });
          if (!report) {
            await awardPoints(emp.id, POINT_ACTIONS.DAILY_REPORT_MISSING,
              `Missing daily report: ${today}`, 'daily_report');
          }
        }
        logger.info('Missing report check complete');
      } catch (err) {
        logger.error('Missing report cron failed:', err);
      }
    }, { timezone: 'Asia/Kolkata' });

    // Monthly: Reset current month points on 1st at midnight
    cron.schedule('0 0 1 * *', async () => {
      logger.info('Resetting monthly points...');
      try {
        const { Employee } = await import('./models');
        await Employee.update({ currentMonthPoints: 0 }, { where: { isActive: true } });
        logger.info('Monthly points reset complete');
      } catch (err) {
        logger.error('Monthly points reset failed:', err);
      }
    }, { timezone: 'Asia/Kolkata' });

    // Daily: Auto-expire old daily reports (older than 30 days)
    cron.schedule('0 1 * * *', async () => {
      const { DailyReport } = await import('./models');
      const { Op } = require('sequelize');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const deleted = await DailyReport.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });
      if (deleted > 0) logger.info(`Deleted ${deleted} old daily reports`);
    }, { timezone: 'Asia/Kolkata' });

    // ─── Start server ─────────────────────────────────────────
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Movigo FieldOps API running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    });

    // ─── Graceful shutdown ────────────────────────────────────
    const shutdown = async () => {
      logger.info('Shutting down...');
      httpServer.close();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
    process.on('uncaughtException', (err) => { logger.error('Uncaught exception:', err); process.exit(1); });

  } catch (err) {
    logger.error('Bootstrap failed:', err);
    process.exit(1);
  }
};

bootstrap();
