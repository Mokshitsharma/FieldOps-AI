import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { DriverOnboarding, Employee, Zone } from '../../models';
import { awardPoints, POINT_ACTIONS } from '../../utils/pointsEngine';

// ─── Submit Driver Onboarding / Visit ────────────────────────
export const submitDriverEntry = async (req: Request, res: Response): Promise<void> => {
  const {
    entryType, driverName, driverPhone, vehicleType,
    preferredZones, paymentStatus, paymentAmount, paymentMethod,
    notes, lat, lng, zoneId,
  } = req.body;

  const employeeId = req.user!.id;

  const entry = await DriverOnboarding.create({
    employeeId,
    zoneId: zoneId || null,
    entryType,
    driverName,
    driverPhone,
    vehicleType,
    preferredZones: Array.isArray(preferredZones) ? JSON.stringify(preferredZones) : preferredZones,
    paymentStatus: paymentStatus || 'not_paid',
    paymentAmount: paymentStatus === 'paid' ? (paymentAmount || 0) : 0,
    paymentMethod: paymentMethod || 'cash',
    notes,
    lat, lng,
    photoUrl: req.file ? `/uploads/photos/${req.file.filename}` : null,
  });

  // Award points based on entry type
  if (entryType === 'new_onboarding') {
    await awardPoints(employeeId, POINT_ACTIONS.NEW_DRIVER_ONBOARDED,
      `New driver onboarded: ${driverName}`, 'driver_onboarding', entry.id);

    if (paymentStatus === 'paid') {
      await awardPoints(employeeId, POINT_ACTIONS.DRIVER_PAYMENT_FIELD,
        `Payment collected from driver: ${driverName} - ₹${paymentAmount}`, 'driver_onboarding', entry.id);
    }
  } else if (entryType === 'visit_followup') {
    await awardPoints(employeeId, POINT_ACTIONS.FOLLOWUP_VISIT,
      `Follow-up visit: ${driverName}`, 'driver_onboarding', entry.id);
  }

  res.status(201).json({ success: true, message: 'Driver entry submitted', data: entry });
};

// ─── Get Driver Entries (Admin) ───────────────────────────────
export const getDriverEntries = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, entryType, zoneId, search, page = 1, limit = 20, startDate, endDate } = req.query;
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (entryType) where.entryType = entryType;
  if (zoneId) where.zoneId = zoneId;
  if (search) {
    where[Op.or] = [
      { driverName: { [Op.like]: `%${search}%` } },
      { driverPhone: { [Op.like]: `%${search}%` } },
    ];
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate as string);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate as string);
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await DriverOnboarding.findAndCountAll({
    where,
    include: [
      { model: Employee, attributes: ['name', 'employeeId', 'jobType'] },
      { model: Zone, attributes: ['name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

// ─── Get My Driver Entries (Employee) ────────────────────────
export const getMyDriverEntries = async (req: Request, res: Response): Promise<void> => {
  const { entryType, page = 1, limit = 20 } = req.query;
  const where: any = { employeeId: req.user!.id };
  if (entryType) where.entryType = entryType;

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await DriverOnboarding.findAndCountAll({
    where,
    include: [{ model: Zone, attributes: ['name'], required: false }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

// ─── Pass driver to calling team ─────────────────────────────
export const passToCallingTeam = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { callingEmployeeId } = req.body;

  const entry = await DriverOnboarding.findByPk(id);
  if (!entry) { res.status(404).json({ success: false, message: 'Entry not found' }); return; }

  entry.isPassedToCalling = true;
  entry.callingEmployeeId = callingEmployeeId || null;
  await entry.save();

  res.json({ success: true, message: 'Passed to calling team' });
};

// ─── Get Driver Stats (Admin Dashboard) ──────────────────────
export const getDriverStats = async (req: Request, res: Response): Promise<void> => {
  const { month, year } = req.query;
  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

  const [totalNew, totalVisits, totalPaid, totalUnpaid] = await Promise.all([
    DriverOnboarding.count({ where: { entryType: 'new_onboarding', createdAt: { [Op.between]: [startDate, endDate] } } }),
    DriverOnboarding.count({ where: { entryType: 'visit_followup', createdAt: { [Op.between]: [startDate, endDate] } } }),
    DriverOnboarding.count({ where: { paymentStatus: 'paid', createdAt: { [Op.between]: [startDate, endDate] } } }),
    DriverOnboarding.count({ where: { paymentStatus: 'not_paid', entryType: 'new_onboarding', createdAt: { [Op.between]: [startDate, endDate] } } }),
  ]);

  res.json({ success: true, data: { totalNewOnboardings: totalNew, totalFollowUpVisits: totalVisits, totalPaid, totalPendingPayment: totalUnpaid } });
};
