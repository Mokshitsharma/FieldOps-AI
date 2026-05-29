import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { RetailerOnboarding, Employee, Zone } from '../../models';
import { awardPoints, POINT_ACTIONS } from '../../utils/pointsEngine';

export const submitRetailerEntry = async (req: Request, res: Response): Promise<void> => {
  const {
    entryType, retailerName, retailerPhone, shopLocation,
    minOrdersPerDay, orderValue, orderDetails, notes, lat, lng, zoneId,
  } = req.body;

  const entry = await RetailerOnboarding.create({
    employeeId: req.user!.id,
    zoneId: zoneId || null,
    entryType,
    retailerName,
    retailerPhone,
    shopLocation,
    minOrdersPerDay,
    orderValue: orderValue || 0,
    orderDetails,
    lat, lng, notes,
    photoUrl: req.file ? `/uploads/photos/${req.file.filename}` : null,
  });

  // Award points
  if (entryType === 'new_onboarding') {
    await awardPoints(req.user!.id, POINT_ACTIONS.NEW_RETAILER_ONBOARDED,
      `New retailer onboarded: ${retailerName}`, 'retailer_onboarding', entry.id);
  } else if (entryType === 'order_generated') {
    await awardPoints(req.user!.id, POINT_ACTIONS.ORDER_GENERATED,
      `Order generated at: ${retailerName}`, 'retailer_onboarding', entry.id);
  } else if (entryType === 'visit_followup') {
    await awardPoints(req.user!.id, POINT_ACTIONS.FOLLOWUP_VISIT,
      `Follow-up visit: ${retailerName}`, 'retailer_onboarding', entry.id);
  }

  res.status(201).json({ success: true, message: 'Retailer entry submitted', data: entry });
};

export const getRetailerEntries = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, entryType, zoneId, search, page = 1, limit = 20 } = req.query;
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (entryType) where.entryType = entryType;
  if (zoneId) where.zoneId = zoneId;
  if (search) {
    where[Op.or] = [
      { retailerName: { [Op.like]: `%${search}%` } },
      { shopLocation: { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await RetailerOnboarding.findAndCountAll({
    where,
    include: [
      { model: Employee, attributes: ['name', 'employeeId'] },
      { model: Zone, attributes: ['name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit), offset,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const getMyRetailerEntries = async (req: Request, res: Response): Promise<void> => {
  const { entryType, page = 1, limit = 20 } = req.query;
  const where: any = { employeeId: req.user!.id };
  if (entryType) where.entryType = entryType;

  const { count, rows } = await RetailerOnboarding.findAndCountAll({
    where,
    include: [{ model: Zone, attributes: ['name'], required: false }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const getRetailerStats = async (req: Request, res: Response): Promise<void> => {
  const { month, year } = req.query;
  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
  const dateFilter = { [Op.between]: [startDate, endDate] };

  const [newOnboardings, followUps, ordersGenerated] = await Promise.all([
    RetailerOnboarding.count({ where: { entryType: 'new_onboarding', createdAt: dateFilter } }),
    RetailerOnboarding.count({ where: { entryType: 'visit_followup', createdAt: dateFilter } }),
    RetailerOnboarding.count({ where: { entryType: 'order_generated', createdAt: dateFilter } }),
  ]);

  res.json({ success: true, data: { newOnboardings, followUps, ordersGenerated } });
};
