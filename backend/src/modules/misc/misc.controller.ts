import { Request, Response } from 'express';
import { Op } from 'sequelize';
import {
  Warning, Target, SalaryRecord, SalaryHistory, Zone, EmployeeZone,
  Employee, AppConfig, Attendance, LeaveRequest, ExpenseClaim, Notification,
} from '../../models';
import { sendNotificationToEmployee } from '../../utils/notify';

// ════════════════════════════════════════════════════════════════
// ZONES
// ════════════════════════════════════════════════════════════════

export const createZone = async (req: Request, res: Response): Promise<void> => {
  const zone = await Zone.create(req.body);
  res.status(201).json({ success: true, data: zone });
};

export const getZones = async (req: Request, res: Response): Promise<void> => {
  const zones = await Zone.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
  res.json({ success: true, data: zones });
};

export const updateZone = async (req: Request, res: Response): Promise<void> => {
  const zone = await Zone.findByPk(req.params.id);
  if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }
  await zone.update(req.body);
  res.json({ success: true, data: zone });
};

export const deleteZone = async (req: Request, res: Response): Promise<void> => {
  await Zone.update({ isActive: false }, { where: { id: req.params.id } });
  res.json({ success: true, message: 'Zone deactivated' });
};

export const assignZonesToEmployee = async (req: Request, res: Response): Promise<void> => {
  const { employeeId } = req.params;
  const { zoneIds } = req.body; // array of zone IDs

  // Remove existing, add new
  await EmployeeZone.destroy({ where: { employeeId } });
  if (zoneIds?.length > 0) {
    await EmployeeZone.bulkCreate(zoneIds.map((zId: number) => ({ employeeId, zoneId: zId, isActive: true })));
  }

  res.json({ success: true, message: 'Zones updated' });
};

export const getEmployeeZones = async (req: Request, res: Response): Promise<void> => {
  const zones = await EmployeeZone.findAll({
    where: { employeeId: req.params.employeeId || req.user!.id, isActive: true },
    include: [{ model: Zone }],
  });
  res.json({ success: true, data: zones.map((ez: any) => ez.Zone) });
};

// ════════════════════════════════════════════════════════════════
// WARNINGS
// ════════════════════════════════════════════════════════════════

export const issueWarning = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, type, severity, subject, description } = req.body;

  const warning = await Warning.create({ employeeId, issuedBy: req.user!.id, type, severity, subject, description });

  await Employee.increment('warningCount', { where: { id: employeeId } });

  await sendNotificationToEmployee(Number(employeeId), {
    type: 'warning',
    title: `⚠️ Warning Issued`,
    body: subject,
    data: { warningId: warning.id },
  });

  res.status(201).json({ success: true, message: 'Warning issued', data: warning });
};

export const getWarnings = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (req.query.employeeId) where.employeeId = req.query.employeeId;

  const warnings = await Warning.findAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: warnings });
};

export const acknowledgeWarning = async (req: Request, res: Response): Promise<void> => {
  const warning = await Warning.findOne({ where: { id: req.params.id, employeeId: req.user!.id } });
  if (!warning) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  warning.acknowledgedAt = new Date();
  await warning.save();
  res.json({ success: true, message: 'Warning acknowledged' });
};

// ════════════════════════════════════════════════════════════════
// TARGETS
// ════════════════════════════════════════════════════════════════

export const createTarget = async (req: Request, res: Response): Promise<void> => {
  const target = await Target.create({ ...req.body, createdBy: req.user!.id });

  await sendNotificationToEmployee(req.body.employeeId, {
    type: 'target',
    title: '🎯 New Target Assigned',
    body: `${req.body.targetType} target: ${req.body.title} — ${req.body.targetValue} ${req.body.unit}`,
    data: { targetId: target.id },
  });

  res.status(201).json({ success: true, data: target });
};

export const getTargets = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (req.query.employeeId) where.employeeId = req.query.employeeId;
  if (req.query.month) where.month = req.query.month;
  if (req.query.year) where.year = req.query.year;
  if (req.query.targetType) where.targetType = req.query.targetType;

  const targets = await Target.findAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId', 'jobType'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: targets });
};

export const updateTargetProgress = async (req: Request, res: Response): Promise<void> => {
  const { achievedValue } = req.body;
  const target = await Target.findByPk(req.params.id);
  if (!target) { res.status(404).json({ success: false, message: 'Not found' }); return; }

  target.achievedValue = achievedValue;
  const achievementPct = target.targetValue > 0 ? (achievedValue / target.targetValue) * 100 : 0;

  if (achievementPct >= 100) {
    target.status = 'achieved';
    const { awardPoints, POINT_ACTIONS } = await import('../../utils/pointsEngine');
    const action = target.targetType === 'monthly' ? POINT_ACTIONS.MONTHLY_TARGET_ACHIEVED : POINT_ACTIONS.WEEKLY_TARGET_ACHIEVED;
    await awardPoints(target.employeeId, action, `Target achieved: ${target.title}`, 'target', target.id);
  } else if (achievementPct >= 50) {
    target.status = 'partial';
  }

  await target.save();
  res.json({ success: true, data: target });
};

// ════════════════════════════════════════════════════════════════
// SALARY
// ════════════════════════════════════════════════════════════════

export const generateSalary = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, month, year } = req.body;

  const existing = await SalaryRecord.findOne({ where: { employeeId, month, year, status: { [Op.in]: ['approved', 'paid'] } } });
  if (existing) { res.status(409).json({ success: false, message: `Salary already ${existing.status} for this month` }); return; }

  const emp = await Employee.findByPk(employeeId);
  if (!emp) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const attendanceRecords = await Attendance.findAll({
    where: { employeeId, date: { [Op.between]: [startDate, endDate] } },
  });

  const config = await AppConfig.findOne({ where: { configKey: 'salaryRules' } });
  const rules = config ? JSON.parse(config.configValue) : { workingDaysPerMonth: 26 };

  const workingDays = rules.workingDaysPerMonth || 26;
  const presentDays = attendanceRecords.filter(a => ['present', 'paid_leave'].includes(a.status)).length;
  const halfDays = attendanceRecords.filter(a => a.status === 'half_day').length;
  const totalLateMinutes = attendanceRecords.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

  const effectivePresent = presentDays + halfDays * 0.5;
  const absentDays = Math.max(0, workingDays - effectivePresent);
  const perDaySalary = Number(emp.basicSalary) / workingDays;
  const absentDeduction = absentDays * perDaySalary;
  const lateDeductionPerMin = rules.lateDeductionPerMinute || 5;
  const lateDeduction = totalLateMinutes * lateDeductionPerMin;
  const netSalary = Number(emp.basicSalary) - absentDeduction - lateDeduction;

  const [record] = await SalaryRecord.upsert({
    employeeId,
    month,
    year,
    workingDays,
    presentDays: effectivePresent,
    absentDays,
    lateMinutes: totalLateMinutes,
    basicSalary: emp.basicSalary,
    absentDeduction: parseFloat(absentDeduction.toFixed(2)),
    lateDeduction: parseFloat(lateDeduction.toFixed(2)),
    netSalary: parseFloat(Math.max(0, netSalary).toFixed(2)),
    bonus: 0,
    adjustment: 0,
    totalPayout: parseFloat(Math.max(0, netSalary).toFixed(2)),
    status: 'draft',
  });

  res.json({ success: true, message: 'Salary generated', data: record });
};

export const approveSalary = async (req: Request, res: Response): Promise<void> => {
  const record = await SalaryRecord.findByPk(req.params.id);
  if (!record) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  if (record.status === 'paid') { res.status(409).json({ success: false, message: 'Already paid' }); return; }

  record.status = 'approved';
  record.approvedBy = req.user!.id;
  record.approvedAt = new Date();
  await record.save();

  await sendNotificationToEmployee(record.employeeId, {
    type: 'salary',
    title: '✅ Salary Approved',
    body: `Your salary for ${record.month}/${record.year} has been approved: ₹${record.totalPayout}`,
    data: { salaryId: record.id },
  });

  res.json({ success: true, message: 'Salary approved' });
};

export const markSalaryPaid = async (req: Request, res: Response): Promise<void> => {
  const record = await SalaryRecord.findByPk(req.params.id);
  if (!record) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  record.status = 'paid';
  record.paidAt = new Date();
  await record.save();

  await sendNotificationToEmployee(record.employeeId, {
    type: 'salary',
    title: '💰 Salary Paid',
    body: `₹${record.totalPayout} has been paid for ${record.month}/${record.year}`,
    data: { salaryId: record.id },
  });

  res.json({ success: true, message: 'Marked as paid' });
};

export const getSalaryRecords = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (req.query.employeeId) where.employeeId = req.query.employeeId;
  if (req.query.month) where.month = req.query.month;
  if (req.query.year) where.year = req.query.year;

  const records = await SalaryRecord.findAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId'] }],
    order: [['year', 'DESC'], ['month', 'DESC']],
  });
  res.json({ success: true, data: records });
};

export const getSalaryHistory = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.params.employeeId || req.user!.id;
  const history = await SalaryHistory.findAll({
    where: { employeeId },
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: history });
};

export const adjustSalary = async (req: Request, res: Response): Promise<void> => {
  const { adjustment, adjustmentReason, bonus, bonusReason } = req.body;
  const record = await SalaryRecord.findByPk(req.params.id);
  if (!record) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  if (record.status === 'paid') { res.status(409).json({ success: false, message: 'Cannot adjust paid record' }); return; }

  if (adjustment !== undefined) { record.adjustment = adjustment; record.adjustmentReason = adjustmentReason; }
  if (bonus !== undefined) { record.bonus = bonus; record.bonusReason = bonusReason; }
  record.totalPayout = parseFloat((Number(record.netSalary) + Number(record.bonus || 0) + Number(record.adjustment || 0)).toFixed(2));
  await record.save();

  res.json({ success: true, message: 'Salary adjusted', data: record });
};

// ════════════════════════════════════════════════════════════════
// LEAVES & EXPENSES
// ════════════════════════════════════════════════════════════════

export const applyLeave = async (req: Request, res: Response): Promise<void> => {
  const { leaveType, startDate, endDate, reason } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

  const leave = await LeaveRequest.create({
    employeeId: req.user!.id,
    leaveType, startDate, endDate, days, reason, status: 'pending',
  });
  res.status(201).json({ success: true, data: leave });
};

export const reviewLeave = async (req: Request, res: Response): Promise<void> => {
  const leave = await LeaveRequest.findByPk(req.params.id);
  if (!leave) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  leave.status = req.body.status;
  leave.reviewedBy = req.user!.id;
  leave.reviewNote = req.body.reviewNote;
  leave.reviewedAt = new Date();
  await leave.save();

  await sendNotificationToEmployee(leave.employeeId, {
    type: 'leave',
    title: `Leave ${req.body.status === 'approved' ? '✅ Approved' : '❌ Rejected'}`,
    body: `Your leave request has been ${req.body.status}${req.body.reviewNote ? ': ' + req.body.reviewNote : ''}`,
    data: { leaveId: leave.id },
  });
  res.json({ success: true, message: `Leave ${req.body.status}` });
};

export const getLeaves = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (req.query.employeeId) where.employeeId = req.query.employeeId;
  if (req.query.status) where.status = req.query.status;

  const leaves = await LeaveRequest.findAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: leaves });
};

export const submitExpense = async (req: Request, res: Response): Promise<void> => {
  const expense = await ExpenseClaim.create({
    ...req.body,
    employeeId: req.user!.id,
    receiptUrl: req.file ? `/uploads/receipts/${req.file.filename}` : null,
  });
  res.status(201).json({ success: true, data: expense });
};

export const reviewExpense = async (req: Request, res: Response): Promise<void> => {
  const expense = await ExpenseClaim.findByPk(req.params.id);
  if (!expense) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  expense.status = req.body.status;
  expense.reviewedBy = req.user!.id;
  expense.reviewNote = req.body.reviewNote;
  expense.reviewedAt = new Date();
  await expense.save();

  await sendNotificationToEmployee(expense.employeeId, {
    type: 'expense',
    title: `Expense ${req.body.status === 'approved' ? '✅ Approved' : '❌ Rejected'}`,
    body: `Your expense claim of ₹${expense.amount} has been ${req.body.status}`,
    data: { expenseId: expense.id },
  });
  res.json({ success: true, message: `Expense ${req.body.status}` });
};

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (req.query.employeeId) where.employeeId = req.query.employeeId;
  if (req.query.status) where.status = req.query.status;

  const expenses = await ExpenseClaim.findAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: expenses });
};

// ════════════════════════════════════════════════════════════════
// APP CONFIG
// ════════════════════════════════════════════════════════════════

export const getConfig = async (req: Request, res: Response): Promise<void> => {
  const configs = await AppConfig.findAll();
  const result: Record<string, any> = {};
  configs.forEach(c => { try { result[c.configKey] = JSON.parse(c.configValue); } catch { result[c.configKey] = c.configValue; } });
  res.json({ success: true, data: result });
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  const { key, value } = req.body;
  const [record] = await AppConfig.upsert({ configKey: key, configValue: JSON.stringify(value), updatedBy: req.user!.id });
  res.json({ success: true, message: 'Config updated', data: record });
};

export const getPublicConfig = async (_req: Request, res: Response): Promise<void> => {
  const publicKeys = ['officeTimings', 'attendanceRules', 'appVersioning', 'maintenance', 'features', 'companyInfo'];
  const configs = await AppConfig.findAll({ where: { configKey: publicKeys } });
  const result: Record<string, any> = {};
  configs.forEach(c => { try { result[c.configKey] = JSON.parse(c.configValue); } catch {} });
  res.json({ success: true, data: result });
};

// Notifications
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;
  const { count, rows } = await Notification.findAndCountAll({
    where: { recipientId: req.user!.id, recipientRole: req.user!.role === 'employee' ? 'employee' : 'admin' },
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });
  const unread = await Notification.count({ where: { recipientId: req.user!.id, isRead: false } });
  res.json({ success: true, data: { notifications: rows, unreadCount: unread }, pagination: { total: count } });
};

export const markNotifRead = async (req: Request, res: Response): Promise<void> => {
  await Notification.update({ isRead: true, readAt: new Date() }, { where: { recipientId: req.user!.id, ...(req.params.id !== 'all' ? { id: req.params.id } : {}) } });
  res.json({ success: true });
};
