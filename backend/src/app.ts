import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';

// ─── Controllers ──────────────────────────────────────────────
import * as auth from './modules/auth/auth.controller';
import * as attendance from './modules/attendance/attendance.controller';
import * as drivers from './modules/drivers/driver.controller';
import * as retailers from './modules/retailers/retailer.controller';
import * as reports from './modules/reports/reports.controller';
import * as notices from './modules/notices/notices.controller';
import * as leaderboard from './modules/leaderboard/leaderboard.controller';
import * as misc from './modules/misc/misc.controller';
import { authenticate, authorizeAdmin } from './middleware/auth';

// ─── Upload middleware ────────────────────────────────────────
import multer from 'multer';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const makeStorage = (subDir: string) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.jpg';
    cb(null, `${uuidv4()}${safeExt}`);
  },
});

const uploadPhoto = multer({ storage: makeStorage('photos'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { cb(null, ['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype)); } });
const uploadReceipt = multer({ storage: makeStorage('receipts'), limits: { fileSize: 10 * 1024 * 1024 } });

export const createApp = () => {
  const app = express();

  // ─── Security ─────────────────────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: (origin, cb) => {
      const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim());
      if (!origin || allowed.includes(origin) || allowed.includes('*')) cb(null, true);
      else cb(new Error('CORS blocked'));
    },
    credentials: true,
  }));

  // ─── Rate limiting ────────────────────────────────────────
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX) || 200 });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10, message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' } });

  app.use(globalLimiter);
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

  // ─── Static uploads ───────────────────────────────────────
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const API = '/api/v1';

  // ─── Health ───────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
  });

  // ─── Public ───────────────────────────────────────────────
  app.get(`${API}/app-config/public`, misc.getPublicConfig);

  // ─── Auth ─────────────────────────────────────────────────
  app.post(`${API}/auth/admin/login`, authLimiter, auth.adminLogin);
  app.post(`${API}/auth/employee/login`, authLimiter, auth.employeeLogin);
  app.post(`${API}/auth/refresh`, auth.refreshToken);
  app.post(`${API}/auth/logout`, authenticate, auth.logout);
  app.get(`${API}/auth/me`, authenticate, auth.getMe);

  // ─── Employees (Admin) ────────────────────────────────────
  app.post(`${API}/employees`, authenticate, authorizeAdmin, auth.createEmployee);
  app.get(`${API}/employees`, authenticate, authorizeAdmin, auth.getEmployees);
  app.get(`${API}/employees/:id`, authenticate, authorizeAdmin, (req, res) => {
    Employee.findByPk(req.params.id, { attributes: { exclude: ['password', 'refreshTokens'] }, include: [{ model: Zone, through: { attributes: [] } }] }).then(emp => {
      if (!emp) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: emp });
    });
  });
  app.put(`${API}/employees/:id`, authenticate, authorizeAdmin, auth.updateEmployee);
  app.patch(`${API}/employees/:id/status`, authenticate, authorizeAdmin, auth.toggleEmployeeStatus);
  app.post(`${API}/employees/:id/salary-hike`, authenticate, authorizeAdmin, auth.salaryHike);
  app.post(`${API}/employees/:id/bonus`, authenticate, authorizeAdmin, auth.giveBonus);

  // ─── Zones ────────────────────────────────────────────────
  app.get(`${API}/zones`, authenticate, misc.getZones);
  app.post(`${API}/zones`, authenticate, authorizeAdmin, misc.createZone);
  app.put(`${API}/zones/:id`, authenticate, authorizeAdmin, misc.updateZone);
  app.delete(`${API}/zones/:id`, authenticate, authorizeAdmin, misc.deleteZone);
  app.put(`${API}/employees/:employeeId/zones`, authenticate, authorizeAdmin, misc.assignZonesToEmployee);
  app.get(`${API}/employees/:employeeId/zones`, authenticate, authorizeAdmin, misc.getEmployeeZones);
  app.get(`${API}/my/zones`, authenticate, misc.getEmployeeZones);

  // ─── Attendance ───────────────────────────────────────────
  app.post(`${API}/attendance/check-in`, authenticate, attendance.checkIn);
  app.post(`${API}/attendance/check-out`, authenticate, attendance.checkOut);
  app.get(`${API}/attendance/my`, authenticate, attendance.getMyAttendance);
  app.get(`${API}/attendance`, authenticate, authorizeAdmin, attendance.getAllAttendance);

  // ─── Location ─────────────────────────────────────────────
  app.post(`${API}/location/batch`, authenticate, attendance.uploadLocationBatch);
  app.get(`${API}/location/live`, authenticate, authorizeAdmin, attendance.getLiveLocations);
  app.get(`${API}/location/route/:employeeId/:date`, authenticate, authorizeAdmin, attendance.getRouteHistory);

  // ─── Drivers ──────────────────────────────────────────────
  app.post(`${API}/drivers`, authenticate, uploadPhoto.single('photo'), drivers.submitDriverEntry);
  app.get(`${API}/drivers`, authenticate, authorizeAdmin, drivers.getDriverEntries);
  app.get(`${API}/drivers/my`, authenticate, drivers.getMyDriverEntries);
  app.get(`${API}/drivers/stats`, authenticate, authorizeAdmin, drivers.getDriverStats);
  app.patch(`${API}/drivers/:id/pass-to-calling`, authenticate, authorizeAdmin, drivers.passToCallingTeam);

  // ─── Retailers ────────────────────────────────────────────
  app.post(`${API}/retailers`, authenticate, uploadPhoto.single('photo'), retailers.submitRetailerEntry);
  app.get(`${API}/retailers`, authenticate, authorizeAdmin, retailers.getRetailerEntries);
  app.get(`${API}/retailers/my`, authenticate, retailers.getMyRetailerEntries);
  app.get(`${API}/retailers/stats`, authenticate, authorizeAdmin, retailers.getRetailerStats);

  // ─── Call Logs (Calling Team) ─────────────────────────────
  app.post(`${API}/calls`, authenticate, reports.submitCallLog);
  app.get(`${API}/calls`, authenticate, reports.getCallLogs);
  app.get(`${API}/calls/stats`, authenticate, reports.getCallStats);
  app.patch(`${API}/calls/:id/followup-done`, authenticate, reports.markFollowUpDone);

  // ─── Payment Collections ──────────────────────────────────
  app.post(`${API}/payments`, authenticate, uploadPhoto.single('receipt'), reports.submitPaymentCollection);
  app.get(`${API}/payments`, authenticate, reports.getPaymentCollections);
  app.patch(`${API}/payments/:id/verify`, authenticate, authorizeAdmin, reports.verifyPayment);

  // ─── Daily Reports ────────────────────────────────────────
  app.post(`${API}/daily-reports`, authenticate, reports.submitDailyReport);
  app.get(`${API}/daily-reports`, authenticate, reports.getDailyReports);
  app.patch(`${API}/daily-reports/:id/remark`, authenticate, authorizeAdmin, reports.addAdminRemark);

  // ─── Leaderboard ──────────────────────────────────────────
  app.get(`${API}/leaderboard`, authenticate, leaderboard.getLeaderboardData);
  app.get(`${API}/leaderboard/my-rank`, authenticate, leaderboard.getMyRank);
  app.get(`${API}/leaderboard/my-points`, authenticate, leaderboard.getMyPoints);
  app.post(`${API}/leaderboard/teamwork-bonus`, authenticate, leaderboard.submitTeamworkBonus);
  app.patch(`${API}/leaderboard/teamwork-bonus/:id`, authenticate, authorizeAdmin, leaderboard.reviewTeamworkBonus);

  // ─── Employee of Month ────────────────────────────────────
  app.get(`${API}/employee-of-month/recommend`, authenticate, authorizeAdmin, leaderboard.getEmployeeOfMonthRecommendation);
  app.post(`${API}/employee-of-month/confirm`, authenticate, authorizeAdmin, leaderboard.confirmEmployeeOfMonth);
  app.get(`${API}/employee-of-month/history`, authenticate, leaderboard.getEmployeeOfMonthHistory);

  // ─── Notices ──────────────────────────────────────────────
  app.post(`${API}/notices`, authenticate, authorizeAdmin, notices.createNotice);
  app.get(`${API}/notices`, authenticate, notices.getNotices);
  app.delete(`${API}/notices/:id`, authenticate, authorizeAdmin, notices.deleteNotice);

  // ─── Notes ────────────────────────────────────────────────
  app.post(`${API}/notes`, authenticate, authorizeAdmin, notices.sendNote);
  app.get(`${API}/notes/my`, authenticate, notices.getMyNotes);
  app.get(`${API}/notes`, authenticate, authorizeAdmin, notices.getAdminNotes);
  app.post(`${API}/notes/:id/reply`, authenticate, notices.replyToNote);
  app.patch(`${API}/notes/:id/read`, authenticate, notices.markNoteRead);

  // ─── Warnings ─────────────────────────────────────────────
  app.post(`${API}/warnings`, authenticate, authorizeAdmin, misc.issueWarning);
  app.get(`${API}/warnings`, authenticate, misc.getWarnings);
  app.patch(`${API}/warnings/:id/acknowledge`, authenticate, misc.acknowledgeWarning);

  // ─── Targets ──────────────────────────────────────────────
  app.post(`${API}/targets`, authenticate, authorizeAdmin, misc.createTarget);
  app.get(`${API}/targets`, authenticate, misc.getTargets);
  app.patch(`${API}/targets/:id/progress`, authenticate, misc.updateTargetProgress);

  // ─── Salary ───────────────────────────────────────────────
  app.post(`${API}/salary/generate`, authenticate, authorizeAdmin, misc.generateSalary);
  app.post(`${API}/salary/generate-bulk`, authenticate, authorizeAdmin, async (req, res) => {
    const { month, year } = req.body;
    const { Employee } = await import('./models');
    const employees = await Employee.findAll({ where: { isActive: true }, attributes: ['id'] });
    const results = await Promise.allSettled(
      employees.map(emp => misc.generateSalary({ ...req, body: { employeeId: emp.id, month, year } } as any, res))
    );
    res.json({ success: true, message: 'Bulk salary generation complete' });
  });
  app.patch(`${API}/salary/:id/approve`, authenticate, authorizeAdmin, misc.approveSalary);
  app.patch(`${API}/salary/:id/paid`, authenticate, authorizeAdmin, misc.markSalaryPaid);
  app.patch(`${API}/salary/:id/adjust`, authenticate, authorizeAdmin, misc.adjustSalary);
  app.get(`${API}/salary`, authenticate, misc.getSalaryRecords);
  app.get(`${API}/salary/history/:employeeId`, authenticate, misc.getSalaryHistory);

  // ─── Leaves ───────────────────────────────────────────────
  app.post(`${API}/leaves`, authenticate, misc.applyLeave);
  app.get(`${API}/leaves`, authenticate, misc.getLeaves);
  app.patch(`${API}/leaves/:id/review`, authenticate, authorizeAdmin, misc.reviewLeave);

  // ─── Expenses ─────────────────────────────────────────────
  app.post(`${API}/expenses`, authenticate, uploadReceipt.single('receipt'), misc.submitExpense);
  app.get(`${API}/expenses`, authenticate, misc.getExpenses);
  app.patch(`${API}/expenses/:id/review`, authenticate, authorizeAdmin, misc.reviewExpense);

  // ─── Notifications ────────────────────────────────────────
  app.get(`${API}/notifications`, authenticate, misc.getNotifications);
  app.patch(`${API}/notifications/:id/read`, authenticate, misc.markNotifRead);

  // ─── App Config ───────────────────────────────────────────
  app.get(`${API}/app-config`, authenticate, authorizeAdmin, misc.getConfig);
  app.post(`${API}/app-config`, authenticate, authorizeAdmin, misc.updateConfig);

  // ─── Dashboard Stats ──────────────────────────────────────
  app.get(`${API}/dashboard/stats`, authenticate, authorizeAdmin, async (req, res) => {
    const { Employee, Attendance, DriverOnboarding, RetailerOnboarding, CallLog, PaymentCollection, LeaveRequest, ExpenseClaim } = await import('./models');
    const today = new Date().toISOString().split('T')[0];
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    const mStart = new Date(y, m - 1, 1);
    const mEnd = new Date(y, m, 0, 23, 59, 59);

    const [
      totalEmployees, activeToday, onDutyNow, pendingLeaves, pendingExpenses,
      monthDrivers, monthRetailers, monthPayments, pendingCalls,
    ] = await Promise.all([
      Employee.count({ where: { isActive: true } }),
      Attendance.count({ where: { date: today, status: 'present' } }),
      Employee.count({ where: { isOnDuty: true } }),
      LeaveRequest.count({ where: { status: 'pending' } }),
      ExpenseClaim.count({ where: { status: 'pending' } }),
      DriverOnboarding.count({ where: { entryType: 'new_onboarding', createdAt: { [require('sequelize').Op.between]: [mStart, mEnd] } } }),
      RetailerOnboarding.count({ where: { entryType: 'new_onboarding', createdAt: { [require('sequelize').Op.between]: [mStart, mEnd] } } }),
      PaymentCollection.sum('amount', { where: { createdAt: { [require('sequelize').Op.between]: [mStart, mEnd] } } }) || 0,
      CallLog.count({ where: { followUpDate: { [require('sequelize').Op.lte]: new Date() }, followUpCompleted: false } }),
    ]);

    res.json({ success: true, data: {
      totalEmployees, activeToday, onDutyNow, pendingLeaves, pendingExpenses,
      monthDriversOnboarded: monthDrivers, monthRetailersOnboarded: monthRetailers,
      monthTotalPayments: monthPayments, pendingFollowUpCalls: pendingCalls,
    }});
  });

  // ─── Global error handler ─────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Internal server error' });
  });

  return app;
};

// Lazy import for use in route handlers
import { Zone, Employee } from './models';
