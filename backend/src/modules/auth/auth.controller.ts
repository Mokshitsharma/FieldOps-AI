import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { Admin, Employee, SalaryHistory, Notification, AppConfig } from '../../models';
import { generateTokenPair } from '../../middleware/auth';
import { sendNotificationToEmployee } from '../../utils/notify';

// ─── Generate Employee ID ─────────────────────────────────────
const generateEmployeeId = async (jobType: string, customId?: string): Promise<string> => {
  if (customId) return customId.toUpperCase().trim();
  const prefix = jobType === 'field_officer' ? 'FO' : 'CT';
  const last = await Employee.findOne({
    where: { employeeId: { [Op.like]: `${prefix}-%` } },
    order: [['id', 'DESC']],
  });
  if (!last) return `${prefix}-001`;
  const lastNum = parseInt(last.employeeId.split('-')[1]) || 0;
  return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`;
};

// ─── Admin Login ──────────────────────────────────────────────
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ success: false, message: 'Email and password required' }); return; }

  const admin = await Admin.findOne({ where: { email: email.toLowerCase(), isActive: true } });
  if (!admin || !(await admin.comparePassword(password))) {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
    return;
  }

  const { accessToken, refreshToken } = generateTokenPair({ id: admin.id, role: admin.role as any, email: admin.email });
  const tokens = admin.getRefreshTokens();
  tokens.push(refreshToken);
  if (tokens.length > 5) tokens.shift();
  admin.setRefreshTokens(tokens);
  admin.lastLogin = new Date();
  await admin.save();

  res.json({ success: true, data: { admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }, accessToken, refreshToken } });
};

// ─── Employee Login (by employeeId or phone) ─────────────────
export const employeeLogin = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, phone, password, fcmToken, deviceId, appVersion } = req.body;
  const identifier = employeeId || phone;
  if (!identifier || !password) { res.status(400).json({ success: false, message: 'Employee ID/phone and password required' }); return; }

  const employee = await Employee.findOne({
    where: { [Op.or]: [{ employeeId: identifier }, { phone: identifier }], isActive: true },
  });
  if (!employee || !(await employee.comparePassword(password))) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const { accessToken, refreshToken } = generateTokenPair({ id: employee.id, role: 'employee', email: employee.email || '' });
  const tokens = employee.getRefreshTokens();
  tokens.push(refreshToken);
  if (tokens.length > 3) tokens.shift();
  employee.setRefreshTokens(tokens);
  if (fcmToken) employee.fcmToken = fcmToken;
  if (deviceId) employee.deviceId = deviceId;
  if (appVersion) employee.appVersion = appVersion;
  await employee.save();

  // Get employee zones
  const { EmployeeZone, Zone } = await import('../../models');
  const zones = await EmployeeZone.findAll({ where: { employeeId: employee.id, isActive: true }, include: [Zone] });

  // Get app config
  const config: Record<string, any> = {};
  const configRows = await AppConfig.findAll();
  configRows.forEach(r => { try { config[r.configKey] = JSON.parse(r.configValue); } catch {} });

  res.json({
    success: true,
    data: {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        phone: employee.phone,
        jobType: employee.jobType,
        designation: employee.designation,
        basicSalary: employee.basicSalary,
        isOnDuty: employee.isOnDuty,
        totalPoints: employee.totalPoints,
        currentMonthPoints: employee.currentMonthPoints,
        zones: zones.map((ez: any) => ez.Zone),
      },
      accessToken,
      refreshToken,
      appConfig: config,
    },
  });
};

// ─── Refresh Token ────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token, userType } = req.body;
  if (!token) { res.status(400).json({ success: false, message: 'Refresh token required' }); return; }

  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_REFRESH_SECRET) as any;
    const isAdmin = userType === 'admin' || decoded.role !== 'employee';

    let user: any = isAdmin
      ? await Admin.findOne({ where: { id: decoded.id, isActive: true } })
      : await Employee.findOne({ where: { id: decoded.id, isActive: true } });

    if (!user) { res.status(401).json({ success: false, message: 'User not found' }); return; }

    const tokens = user.getRefreshTokens();
    if (!tokens.includes(token)) { res.status(401).json({ success: false, message: 'Token revoked' }); return; }

    // Rotate
    const newTokens = tokens.filter((t: string) => t !== token);
    const { accessToken, refreshToken: newRefresh } = generateTokenPair({ id: user.id, role: decoded.role, email: user.email || '' });
    newTokens.push(newRefresh);
    user.setRefreshTokens(newTokens);
    await user.save();

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// ─── Admin: Create Employee ───────────────────────────────────
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  const {
    name, phone, email, password, jobType, designation, department,
    basicSalary, joiningDate, customEmployeeId,
  } = req.body;

  if (!name || !phone || !password || !jobType) {
    res.status(400).json({ success: false, message: 'name, phone, password, jobType are required' });
    return;
  }

  const existing = await Employee.findOne({ where: { phone } });
  if (existing) { res.status(409).json({ success: false, message: 'Phone number already registered' }); return; }

  const employeeId = await generateEmployeeId(jobType, customEmployeeId);
  const empIdExists = await Employee.findOne({ where: { employeeId } });
  if (empIdExists) { res.status(409).json({ success: false, message: `Employee ID ${employeeId} already taken` }); return; }

  const employee = await Employee.create({
    employeeId,
    name,
    phone,
    email: email || null,
    password,
    jobType,
    designation: designation || (jobType === 'field_officer' ? 'Field Officer' : 'Calling Executive'),
    department: department || (jobType === 'field_officer' ? 'Field Operations' : 'Calling Team'),
    basicSalary: basicSalary || 0,
    joiningDate: joiningDate || new Date(),
    createdBy: req.user!.id,
  });

  // Record initial salary
  if (basicSalary > 0) {
    await SalaryHistory.create({
      employeeId: employee.id,
      changeType: 'initial',
      previousSalary: 0,
      newSalary: basicSalary,
      changeAmount: basicSalary,
      reason: 'Initial salary at joining',
      effectiveDate: joiningDate || new Date(),
      changedBy: req.user!.id,
    });
  }

  res.status(201).json({
    success: true,
    message: `Employee created with ID: ${employeeId}`,
    data: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      phone: employee.phone,
      jobType: employee.jobType,
      employeeCode: employeeId,
      loginCredentials: { employeeId, password: req.body.password },
    },
  });
};

// ─── Admin: Get all employees ─────────────────────────────────
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  const { jobType, isActive, search, page = 1, limit = 20 } = req.query;
  const where: any = {};
  if (jobType) where.jobType = jobType;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { employeeId: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await Employee.findAndCountAll({
    where,
    attributes: { exclude: ['password', 'refreshTokens'] },
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

// ─── Admin: Update employee ───────────────────────────────────
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { password, ...updates } = req.body;

  const employee = await Employee.findByPk(id);
  if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }

  if (password) updates.password = password;
  await employee.update(updates);

  res.json({ success: true, message: 'Employee updated', data: { id: employee.id, employeeId: employee.employeeId, name: employee.name } });
};

// ─── Admin: Toggle active status ─────────────────────────────
export const toggleEmployeeStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const employee = await Employee.findByPk(id);
  if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }

  employee.isActive = !employee.isActive;
  await employee.save();

  res.json({ success: true, message: `Employee ${employee.isActive ? 'activated' : 'deactivated'}` });
};

// ─── Admin: Salary hike ───────────────────────────────────────
export const salaryHike = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { newSalary, reason, effectiveDate } = req.body;

  const employee = await Employee.findByPk(id);
  if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }

  const previous = Number(employee.basicSalary);
  const hike = Number(newSalary) - previous;

  await SalaryHistory.create({
    employeeId: employee.id,
    changeType: 'hike',
    previousSalary: previous,
    newSalary: Number(newSalary),
    changeAmount: hike,
    reason: reason || 'Salary revision',
    effectiveDate: effectiveDate || new Date(),
    changedBy: req.user!.id,
  });

  employee.basicSalary = newSalary;
  await employee.save();

  // Notify employee
  await sendNotificationToEmployee(employee.id, {
    type: 'salary',
    title: '💰 Salary Updated',
    body: `Your salary has been revised from ₹${previous} to ₹${newSalary}. Effective: ${effectiveDate || 'Immediately'}`,
    data: { type: 'salary_hike', newSalary, previousSalary: previous },
  });

  res.json({ success: true, message: 'Salary hike applied and employee notified', data: { previousSalary: previous, newSalary, hike } });
};

// ─── Admin: One-time bonus ────────────────────────────────────
export const giveBonus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const employee = await Employee.findByPk(id);
  if (!employee) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }

  await SalaryHistory.create({
    employeeId: employee.id,
    changeType: 'bonus',
    previousSalary: employee.basicSalary,
    newSalary: employee.basicSalary,
    changeAmount: amount,
    reason: reason || 'Bonus',
    effectiveDate: new Date(),
    changedBy: req.user!.id,
  });

  await sendNotificationToEmployee(employee.id, {
    type: 'salary',
    title: '🎉 Bonus Awarded',
    body: `You have been awarded a bonus of ₹${amount}. Reason: ${reason || 'Performance bonus'}`,
    data: { type: 'bonus', amount },
  });

  res.json({ success: true, message: 'Bonus recorded and employee notified', data: { amount, reason } });
};

// ─── Get My Profile ───────────────────────────────────────────
export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (req.user!.role === 'employee') {
    const emp = await Employee.findByPk(req.user!.id, {
      attributes: { exclude: ['password', 'refreshTokens'] },
      include: [{ model: require('../../models').Zone, through: { attributes: [] } }],
    });
    res.json({ success: true, data: emp });
  } else {
    const admin = await Admin.findByPk(req.user!.id, { attributes: { exclude: ['password', 'refreshTokens'] } });
    res.json({ success: true, data: admin });
  }
};

// ─── Logout ───────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  const isEmployee = req.user!.role === 'employee';

  const user: any = isEmployee
    ? await Employee.findByPk(req.user!.id)
    : await Admin.findByPk(req.user!.id);

  if (user && token) {
    user.setRefreshTokens(user.getRefreshTokens().filter((t: string) => t !== token));
    if (isEmployee) { user.isOnDuty = false; }
    await user.save();
  }
  res.json({ success: true, message: 'Logged out' });
};
