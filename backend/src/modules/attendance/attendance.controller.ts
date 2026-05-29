import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../../config/database';
import { Attendance, LocationLog, Employee, AppConfig, Zone } from '../../models';
import { awardPoints, POINT_ACTIONS } from '../../utils/pointsEngine';

const getConfig = async (key: string): Promise<any> => {
  const row = await AppConfig.findOne({ where: { configKey: key } });
  if (!row) return null;
  try { return JSON.parse(row.configValue); } catch { return null; }
};

// ─── Check In ────────────────────────────────────────────────
export const checkIn = async (req: Request, res: Response): Promise<void> => {
  const { lat, lng } = req.body;
  const employeeId = req.user!.id;
  const today = new Date().toISOString().split('T')[0];

  const existing = await Attendance.findOne({ where: { employeeId, date: today } });
  if (existing?.checkInTime) {
    res.status(409).json({ success: false, message: 'Already checked in today' });
    return;
  }

  const timingConfig = await getConfig('officeTimings') || { startTime: '09:00', graceMinutes: 15 };
  const [sh, sm] = timingConfig.startTime.split(':').map(Number);
  const now = new Date();
  const officialStart = new Date(now);
  officialStart.setHours(sh, sm + (timingConfig.graceMinutes || 15), 0, 0);

  const isLate = now > officialStart;
  const lateMinutes = isLate ? Math.floor((now.getTime() - officialStart.getTime()) / 60000) : 0;

  const [record] = await Attendance.upsert({
    employeeId,
    date: today,
    status: 'present',
    checkInTime: now,
    checkInLat: lat,
    checkInLng: lng,
    isLate,
    lateMinutes,
  });

  await Employee.update({ isOnDuty: true }, { where: { id: employeeId } });

  // Award points
  const action = isLate ? POINT_ACTIONS.LATE_CHECKIN : POINT_ACTIONS.ON_TIME_CHECKIN;
  await awardPoints(employeeId, action,
    isLate ? `Late check-in (${lateMinutes} min late)` : 'On-time check-in',
    'attendance', record.id as number);

  res.json({ success: true, message: `Checked in${isLate ? ` (${lateMinutes} minutes late)` : ' on time'}`, data: record });
};

// ─── Check Out ───────────────────────────────────────────────
export const checkOut = async (req: Request, res: Response): Promise<void> => {
  const { lat, lng } = req.body;
  const employeeId = req.user!.id;
  const today = new Date().toISOString().split('T')[0];

  const record = await Attendance.findOne({ where: { employeeId, date: today } });
  if (!record?.checkInTime) { res.status(400).json({ success: false, message: 'Not checked in today' }); return; }
  if (record.checkOutTime) { res.status(409).json({ success: false, message: 'Already checked out' }); return; }

  const now = new Date();
  const workingMs = now.getTime() - new Date(record.checkInTime).getTime();
  const workingHours = parseFloat((workingMs / 3600000).toFixed(2));

  const timingConfig = await getConfig('officeTimings') || { endTime: '18:00' };
  const [eh, em] = (timingConfig.endTime || '18:00').split(':').map(Number);
  const officialEndMinutes = eh * 60 + em;
  const checkOutTotalMins = now.getHours() * 60 + now.getMinutes();
  const extraMins = Math.max(0, checkOutTotalMins - officialEndMinutes);

  const thresholdConfig = await getConfig('attendanceRules') || {};
  const halfDayThreshold = thresholdConfig.halfDayThresholdHours || 4;
  const status = workingHours < halfDayThreshold ? 'half_day' : 'present';

  await record.update({
    checkOutTime: now,
    checkOutLat: lat,
    checkOutLng: lng,
    workingHours,
    status,
    overtimeApproved: extraMins >= 50,
    overtimeHours: extraMins >= 150 ? 3 : extraMins >= 90 ? 2 : extraMins >= 50 ? 1 : 0,
  });

  await Employee.update({ isOnDuty: false }, { where: { id: employeeId } });

  res.json({ success: true, message: 'Checked out successfully', data: { workingHours, overtime: record.overtimeHours, status } });
};

// ─── Upload Location Batch ───────────────────────────────────
export const uploadLocationBatch = async (req: Request, res: Response): Promise<void> => {
  const { locations, zoneId, sessionId } = req.body;
  if (!Array.isArray(locations) || locations.length === 0) {
    res.status(400).json({ success: false, message: 'locations array required' });
    return;
  }

  // Only Field Officers have GPS tracking
  if (req.user!.jobType !== 'field_officer') {
    res.status(400).json({ success: false, message: 'GPS tracking only for Field Officers' });
    return;
  }

  const rows = locations.map((loc: any) => ({
    employeeId: req.user!.id,
    zoneId: zoneId || null,
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
    speed: loc.speed,
    battery: loc.battery,
    isGpsOff: loc.isGpsOff || false,
    timestamp: new Date(loc.timestamp),
    sessionId: sessionId || null,
  }));

  await LocationLog.bulkCreate(rows, { ignoreDuplicates: true });

  // Emit to admin live map
  if (req.app.locals.io && rows.length > 0) {
    const latest = rows[rows.length - 1];
    const emp = await Employee.findByPk(req.user!.id, { attributes: ['name', 'employeeId'] });
    req.app.locals.io.to('admins').emit('location:updated', {
      employeeId: req.user!.id,
      name: emp?.name,
      employeeCode: emp?.employeeId,
      lat: latest.lat,
      lng: latest.lng,
      battery: latest.battery,
      isGpsOff: latest.isGpsOff,
      timestamp: latest.timestamp,
      isOnDuty: true,
    });
  }

  res.json({ success: true, message: `${rows.length} location points saved` });
};

// ─── Get Live Locations (Admin) ───────────────────────────────
export const getLiveLocations = async (req: Request, res: Response): Promise<void> => {
  const employees = await Employee.findAll({
    where: { isOnDuty: true, jobType: 'field_officer', isActive: true },
    attributes: ['id', 'name', 'employeeId', 'avatar'],
  });

  const liveData = await Promise.all(employees.map(async (emp) => {
    const latest = await LocationLog.findOne({
      where: { employeeId: emp.id },
      order: [['timestamp', 'DESC']],
    });
    return {
      employeeId: emp.id,
      name: emp.name,
      employeeCode: emp.employeeId,
      avatar: emp.avatar,
      lat: latest?.lat,
      lng: latest?.lng,
      battery: latest?.battery,
      isGpsOff: latest?.isGpsOff || false,
      lastSeen: latest?.timestamp,
    };
  }));

  res.json({ success: true, data: liveData.filter(d => d.lat) });
};

// ─── Get Route History ────────────────────────────────────────
export const getRouteHistory = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, date } = req.params;
  const start = new Date(date + 'T00:00:00.000Z');
  const end = new Date(date + 'T23:59:59.999Z');

  const logs = await LocationLog.findAll({
    where: { employeeId, timestamp: { [Op.between]: [start, end] } },
    order: [['timestamp', 'ASC']],
    attributes: ['lat', 'lng', 'timestamp', 'speed', 'battery', 'isGpsOff'],
  });

  res.json({ success: true, data: logs });
};

// ─── Get My Attendance ────────────────────────────────────────
export const getMyAttendance = async (req: Request, res: Response): Promise<void> => {
  const { month, year, page = 1, limit = 31 } = req.query;
  const where: any = { employeeId: req.user!.id };

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0);
    where.date = { [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]] };
  }

  const { count, rows } = await Attendance.findAndCountAll({
    where,
    order: [['date', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count } });
};

// ─── Get All Attendance (Admin) ───────────────────────────────
export const getAllAttendance = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, date, month, year, status, page = 1, limit = 20 } = req.query;
  const where: any = {};

  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (date) where.date = date;
  else if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0);
    where.date = { [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]] };
  }

  const { count, rows } = await Attendance.findAndCountAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId', 'jobType'] }],
    order: [['date', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};
