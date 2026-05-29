import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { CallLog, PaymentCollection, DailyReport, Employee, AppConfig } from '../../models';
import { awardPoints, POINT_ACTIONS } from '../../utils/pointsEngine';
import { sendNotificationToEmployee } from '../../utils/notify';

// ════════════════════════════════════════════════════════════════
// CALL LOGS
// ════════════════════════════════════════════════════════════════

export const submitCallLog = async (req: Request, res: Response): Promise<void> => {
  const { personName, personPhone, callType, outcome, notes, followUpDate, driverOnboardingId, callDuration } = req.body;

  const callLog = await CallLog.create({
    employeeId: req.user!.id,
    personName, personPhone, callType, outcome, notes,
    followUpDate: followUpDate || null,
    driverOnboardingId: driverOnboardingId || null,
    callDuration: callDuration || 0,
    paymentCollected: false,
  });

  // Award points
  await awardPoints(req.user!.id, POINT_ACTIONS.CALL_LOGGED,
    `Call logged: ${personName} (${callType}) - ${outcome}`, 'call_log', callLog.id);

  if (outcome === 'converted') {
    await awardPoints(req.user!.id, POINT_ACTIONS.CALL_CONVERTED,
      `Call converted: ${personName}`, 'call_log', callLog.id);
  }

  res.status(201).json({ success: true, message: 'Call logged', data: callLog });
};

export const getCallLogs = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, callType, outcome, followUpDue, page = 1, limit = 20 } = req.query;
  const where: any = {};

  // If employee, only see own logs
  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (employeeId) where.employeeId = employeeId;

  if (callType) where.callType = callType;
  if (outcome) where.outcome = outcome;
  if (followUpDue === 'true') {
    where.followUpDate = { [Op.lte]: new Date() };
    where.followUpCompleted = false;
  }

  const { count, rows } = await CallLog.findAndCountAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId'] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const markFollowUpDone = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const callLog = await CallLog.findOne({ where: { id, employeeId: req.user!.id } });
  if (!callLog) { res.status(404).json({ success: false, message: 'Call log not found' }); return; }

  callLog.followUpCompleted = true;
  await callLog.save();

  await awardPoints(req.user!.id, POINT_ACTIONS.FOLLOWUP_CALL_COMPLETED,
    `Follow-up completed: ${callLog.personName}`, 'call_log', callLog.id);

  res.json({ success: true, message: 'Follow-up marked done' });
};

export const getCallStats = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, month, year } = req.query;
  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
  const where: any = { createdAt: { [Op.between]: [startDate, endDate] } };
  if (employeeId) where.employeeId = employeeId;

  const [total, converted, interested, pending] = await Promise.all([
    CallLog.count({ where }),
    CallLog.count({ where: { ...where, outcome: 'converted' } }),
    CallLog.count({ where: { ...where, outcome: 'interested' } }),
    CallLog.count({ where: { ...where, followUpDate: { [Op.lte]: new Date() }, followUpCompleted: false } }),
  ]);

  res.json({ success: true, data: { totalCalls: total, converted, interested, pendingFollowUps: pending, conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : 0 } });
};

// ════════════════════════════════════════════════════════════════
// PAYMENT COLLECTIONS
// ════════════════════════════════════════════════════════════════

export const submitPaymentCollection = async (req: Request, res: Response): Promise<void> => {
  const { collectionType, driverName, driverPhone, driverOnboardingId, amount, paymentMethod, upiTransactionId, notes } = req.body;

  const payment = await PaymentCollection.create({
    employeeId: req.user!.id,
    collectionType,
    driverName, driverPhone,
    driverOnboardingId: driverOnboardingId || null,
    amount: Number(amount),
    paymentMethod: paymentMethod || 'cash',
    upiTransactionId,
    notes,
    receiptPhotoUrl: req.file ? `/uploads/photos/${req.file.filename}` : null,
  });

  // Award points based on type
  const action = collectionType === 'field'
    ? POINT_ACTIONS.DRIVER_PAYMENT_FIELD
    : POINT_ACTIONS.DRIVER_PAYMENT_CALLING;

  await awardPoints(req.user!.id, action,
    `Payment collected: ${driverName} - ₹${amount}`, 'payment_collection', payment.id);

  res.status(201).json({ success: true, message: 'Payment collection recorded', data: payment });
};

export const getPaymentCollections = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, collectionType, verified, month, year, page = 1, limit = 20 } = req.query;
  const where: any = {};

  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (employeeId) where.employeeId = employeeId;

  if (collectionType) where.collectionType = collectionType;
  if (verified !== undefined) where.verifiedByAdmin = verified === 'true';
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.createdAt = { [Op.between]: [start, end] };
  }

  const { count, rows } = await PaymentCollection.findAndCountAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId'] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  const payment = await PaymentCollection.findByPk(req.params.id);
  if (!payment) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  payment.verifiedByAdmin = true;
  payment.verifiedAt = new Date();
  await payment.save();
  res.json({ success: true, message: 'Payment verified' });
};

// ════════════════════════════════════════════════════════════════
// DAILY REPORTS
// ════════════════════════════════════════════════════════════════

export const submitDailyReport = async (req: Request, res: Response): Promise<void> => {
  const {
    reportDate, zonesVisited, driversContacted, driversOnboarded, retailersVisited,
    retailersOnboarded, ordersGenerated, callsMade, conversions, paymentsCollected,
    totalPaymentAmount, opsIssuesSolved, issuesFaced, tomorrowPlan, additionalNotes,
    targetAchievementPercent,
  } = req.body;

  const today = reportDate || new Date().toISOString().split('T')[0];

  // Check if already submitted
  const existing = await DailyReport.findOne({ where: { employeeId: req.user!.id, reportDate: today } });
  if (existing) { res.status(409).json({ success: false, message: 'Daily report already submitted for today' }); return; }

  const report = await DailyReport.create({
    employeeId: req.user!.id,
    reportDate: today,
    zonesVisited: Array.isArray(zonesVisited) ? JSON.stringify(zonesVisited) : zonesVisited,
    driversContacted: driversContacted || 0,
    driversOnboarded: driversOnboarded || 0,
    retailersVisited: retailersVisited || 0,
    retailersOnboarded: retailersOnboarded || 0,
    ordersGenerated: ordersGenerated || 0,
    callsMade: callsMade || 0,
    conversions: conversions || 0,
    paymentsCollected: paymentsCollected || 0,
    totalPaymentAmount: totalPaymentAmount || 0,
    opsIssuesSolved: opsIssuesSolved || 0,
    issuesFaced, tomorrowPlan, additionalNotes,
    targetAchievementPercent: targetAchievementPercent || 0,
  });

  // Award ops points
  if (opsIssuesSolved > 0) {
    for (let i = 0; i < opsIssuesSolved; i++) {
      await awardPoints(req.user!.id, POINT_ACTIONS.OPS_ISSUE_SOLVED,
        'Ops issue solved (daily report)', 'daily_report', report.id);
    }
  }

  // Award daily report points
  await awardPoints(req.user!.id, POINT_ACTIONS.DAILY_REPORT_SUBMITTED,
    'Daily report submitted', 'daily_report', report.id);

  res.status(201).json({ success: true, message: 'Daily report submitted', data: report });
};

export const getDailyReports = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, date, page = 1, limit = 20 } = req.query;
  const where: any = {};

  if (req.user!.role === 'employee') where.employeeId = req.user!.id;
  else if (employeeId) where.employeeId = employeeId;
  if (date) where.reportDate = date;

  const { count, rows } = await DailyReport.findAndCountAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId', 'jobType'] }],
    order: [['reportDate', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const addAdminRemark = async (req: Request, res: Response): Promise<void> => {
  const report = await DailyReport.findByPk(req.params.id);
  if (!report) { res.status(404).json({ success: false, message: 'Report not found' }); return; }
  report.adminRemarks = req.body.remarks;
  await report.save();

  await sendNotificationToEmployee(report.employeeId, {
    type: 'report_remark',
    title: '📝 Admin Remark on Your Report',
    body: req.body.remarks,
  });

  res.json({ success: true, message: 'Remark added' });
};
