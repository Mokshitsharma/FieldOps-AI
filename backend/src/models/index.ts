import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

// ─────────────────────────────────────────────────────────────
// ADMIN MODEL
// ─────────────────────────────────────────────────────────────
export class Admin extends Model {
  declare id: number;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: 'superadmin' | 'admin' | 'manager';
  declare isActive: boolean;
  declare refreshTokens: string;
  declare lastLogin: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
  getRefreshTokens(): string[] {
    try { return JSON.parse(this.refreshTokens || '[]'); } catch { return []; }
  }
  setRefreshTokens(tokens: string[]): void {
    this.refreshTokens = JSON.stringify(tokens);
  }
}
Admin.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('superadmin', 'admin', 'manager'), defaultValue: 'admin' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  refreshTokens: { type: DataTypes.TEXT, defaultValue: '[]' },
  lastLogin: { type: DataTypes.DATE },
}, {
  sequelize, modelName: 'Admin', tableName: 'admins',
  hooks: {
    beforeCreate: async (admin) => { admin.password = await bcrypt.hash(admin.password, 10); },
    beforeUpdate: async (admin) => { if (admin.changed('password')) admin.password = await bcrypt.hash(admin.password, 10); },
  },
});

// ─────────────────────────────────────────────────────────────
// EMPLOYEE MODEL
// ─────────────────────────────────────────────────────────────
export class Employee extends Model {
  declare id: number;
  declare employeeId: string;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare password: string;
  declare jobType: 'field_officer' | 'calling_team';
  declare department: string;
  declare designation: string;
  declare joiningDate: Date;
  declare basicSalary: number;
  declare isActive: boolean;
  declare isOnDuty: boolean;
  declare deviceId: string;
  declare fcmToken: string;
  declare appVersion: string;
  declare refreshTokens: string;
  declare warningCount: number;
  declare totalPoints: number;
  declare currentMonthPoints: number;
  declare avatar: string;
  declare createdBy: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
  getRefreshTokens(): string[] {
    try { return JSON.parse(this.refreshTokens || '[]'); } catch { return []; }
  }
  setRefreshTokens(tokens: string[]): void {
    this.refreshTokens = JSON.stringify(tokens);
  }
}
Employee.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), unique: true },
  phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  jobType: { type: DataTypes.ENUM('field_officer', 'calling_team'), allowNull: false },
  department: { type: DataTypes.STRING(100), defaultValue: '' },
  designation: { type: DataTypes.STRING(100), defaultValue: '' },
  joiningDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  basicSalary: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isOnDuty: { type: DataTypes.BOOLEAN, defaultValue: false },
  deviceId: { type: DataTypes.STRING(255) },
  fcmToken: { type: DataTypes.STRING(500) },
  appVersion: { type: DataTypes.STRING(20) },
  refreshTokens: { type: DataTypes.TEXT, defaultValue: '[]' },
  warningCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  currentMonthPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  avatar: { type: DataTypes.STRING(500) },
  createdBy: { type: DataTypes.INTEGER },
}, {
  sequelize, modelName: 'Employee', tableName: 'employees',
  hooks: {
    beforeCreate: async (emp) => { emp.password = await bcrypt.hash(emp.password, 10); },
    beforeUpdate: async (emp) => { if (emp.changed('password')) emp.password = await bcrypt.hash(emp.password, 10); },
  },
});

// ─────────────────────────────────────────────────────────────
// ZONE MODEL
// ─────────────────────────────────────────────────────────────
export class Zone extends Model {
  declare id: number;
  declare name: string;
  declare city: string;
  declare description: string;
  declare isActive: boolean;
  declare createdAt: Date;
}
Zone.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  city: { type: DataTypes.STRING(100), defaultValue: 'Indore' },
  description: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'Zone', tableName: 'zones' });

// ─────────────────────────────────────────────────────────────
// EMPLOYEE ZONES (many-to-many)
// ─────────────────────────────────────────────────────────────
export class EmployeeZone extends Model {
  declare id: number;
  declare employeeId: number;
  declare zoneId: number;
  declare isActive: boolean;
}
EmployeeZone.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  zoneId: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'EmployeeZone', tableName: 'employee_zones' });

// ─────────────────────────────────────────────────────────────
// ATTENDANCE MODEL
// ─────────────────────────────────────────────────────────────
export class Attendance extends Model {
  declare id: number;
  declare employeeId: number;
  declare date: string;
  declare status: string;
  declare checkInTime: Date;
  declare checkInLat: number;
  declare checkInLng: number;
  declare checkOutTime: Date;
  declare checkOutLat: number;
  declare checkOutLng: number;
  declare workingHours: number;
  declare overtimeHours: number;
  declare overtimeApproved: boolean;
  declare isLate: boolean;
  declare lateMinutes: number;
  declare isManualEntry: boolean;
  declare editReason: string;
  declare editedBy: number;
}
Attendance.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('present','absent','half_day','paid_leave','unpaid_leave','holiday','week_off'), defaultValue: 'absent' },
  checkInTime: { type: DataTypes.DATE },
  checkInLat: { type: DataTypes.DECIMAL(10, 8) },
  checkInLng: { type: DataTypes.DECIMAL(11, 8) },
  checkOutTime: { type: DataTypes.DATE },
  checkOutLat: { type: DataTypes.DECIMAL(10, 8) },
  checkOutLng: { type: DataTypes.DECIMAL(11, 8) },
  workingHours: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
  overtimeHours: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
  overtimeApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
  isLate: { type: DataTypes.BOOLEAN, defaultValue: false },
  lateMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  isManualEntry: { type: DataTypes.BOOLEAN, defaultValue: false },
  editReason: { type: DataTypes.TEXT },
  editedBy: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'Attendance', tableName: 'attendance',
  indexes: [{ unique: true, fields: ['employeeId', 'date'] }] });

// ─────────────────────────────────────────────────────────────
// LOCATION LOG MODEL
// ─────────────────────────────────────────────────────────────
export class LocationLog extends Model {
  declare id: number;
  declare employeeId: number;
  declare zoneId: number;
  declare lat: number;
  declare lng: number;
  declare accuracy: number;
  declare speed: number;
  declare battery: number;
  declare isGpsOff: boolean;
  declare timestamp: Date;
  declare sessionId: string;
}
LocationLog.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  zoneId: { type: DataTypes.INTEGER },
  lat: { type: DataTypes.DECIMAL(10, 8) },
  lng: { type: DataTypes.DECIMAL(11, 8) },
  accuracy: { type: DataTypes.DECIMAL(8, 2) },
  speed: { type: DataTypes.DECIMAL(8, 2) },
  battery: { type: DataTypes.DECIMAL(5, 2) },
  isGpsOff: { type: DataTypes.BOOLEAN, defaultValue: false },
  timestamp: { type: DataTypes.DATE, allowNull: false },
  sessionId: { type: DataTypes.STRING(50) },
}, { sequelize, modelName: 'LocationLog', tableName: 'location_logs',
  indexes: [{ fields: ['employeeId', 'timestamp'] }] });

// ─────────────────────────────────────────────────────────────
// DRIVER ONBOARDING MODEL
// ─────────────────────────────────────────────────────────────
export class DriverOnboarding extends Model {
  declare id: number;
  declare employeeId: number;
  declare zoneId: number;
  declare entryType: 'new_onboarding' | 'visit_followup';
  declare driverName: string;
  declare driverPhone: string;
  declare vehicleType: string;
  declare preferredZones: string;
  declare paymentStatus: 'paid' | 'not_paid';
  declare paymentAmount: number;
  declare paymentMethod: string;
  declare notes: string;
  declare lat: number;
  declare lng: number;
  declare photoUrl: string;
  declare isPassedToCalling: boolean;
  declare callingEmployeeId: number;
  declare createdAt: Date;
}
DriverOnboarding.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  zoneId: { type: DataTypes.INTEGER },
  entryType: { type: DataTypes.ENUM('new_onboarding','visit_followup'), allowNull: false },
  driverName: { type: DataTypes.STRING(150), allowNull: false },
  driverPhone: { type: DataTypes.STRING(20), allowNull: false },
  vehicleType: { type: DataTypes.STRING(100), allowNull: false },
  preferredZones: { type: DataTypes.TEXT },
  paymentStatus: { type: DataTypes.ENUM('paid','not_paid'), defaultValue: 'not_paid' },
  paymentAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  paymentMethod: { type: DataTypes.ENUM('cash','upi','other'), defaultValue: 'cash' },
  notes: { type: DataTypes.TEXT },
  lat: { type: DataTypes.DECIMAL(10, 8) },
  lng: { type: DataTypes.DECIMAL(11, 8) },
  photoUrl: { type: DataTypes.STRING(500) },
  isPassedToCalling: { type: DataTypes.BOOLEAN, defaultValue: false },
  callingEmployeeId: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'DriverOnboarding', tableName: 'driver_onboardings' });

// ─────────────────────────────────────────────────────────────
// RETAILER ONBOARDING MODEL
// ─────────────────────────────────────────────────────────────
export class RetailerOnboarding extends Model {
  declare id: number;
  declare employeeId: number;
  declare zoneId: number;
  declare entryType: 'new_onboarding' | 'visit_followup' | 'order_generated';
  declare retailerName: string;
  declare retailerPhone: string;
  declare shopLocation: string;
  declare minOrdersPerDay: string;
  declare orderValue: number;
  declare orderDetails: string;
  declare lat: number;
  declare lng: number;
  declare photoUrl: string;
  declare notes: string;
  declare createdAt: Date;
}
RetailerOnboarding.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  zoneId: { type: DataTypes.INTEGER },
  entryType: { type: DataTypes.ENUM('new_onboarding','visit_followup','order_generated'), allowNull: false },
  retailerName: { type: DataTypes.STRING(150), allowNull: false },
  retailerPhone: { type: DataTypes.STRING(20) },
  shopLocation: { type: DataTypes.STRING(300), allowNull: false },
  minOrdersPerDay: { type: DataTypes.ENUM('1-2','2-5','5-10','10+') },
  orderValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  orderDetails: { type: DataTypes.TEXT },
  lat: { type: DataTypes.DECIMAL(10, 8) },
  lng: { type: DataTypes.DECIMAL(11, 8) },
  photoUrl: { type: DataTypes.STRING(500) },
  notes: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'RetailerOnboarding', tableName: 'retailer_onboardings' });

// ─────────────────────────────────────────────────────────────
// CALL LOG MODEL (Calling Team)
// ─────────────────────────────────────────────────────────────
export class CallLog extends Model {
  declare id: number;
  declare employeeId: number;
  declare personName: string;
  declare personPhone: string;
  declare callType: 'retailer' | 'driver';
  declare outcome: 'interested' | 'not_interested' | 'callback' | 'converted' | 'no_answer' | 'busy';
  declare notes: string;
  declare followUpDate: Date;
  declare followUpCompleted: boolean;
  declare driverOnboardingId: number;
  declare paymentCollected: boolean;
  declare paymentAmount: number;
  declare callDuration: number;
  declare createdAt: Date;
}
CallLog.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  personName: { type: DataTypes.STRING(150), allowNull: false },
  personPhone: { type: DataTypes.STRING(20), allowNull: false },
  callType: { type: DataTypes.ENUM('retailer','driver'), allowNull: false },
  outcome: { type: DataTypes.ENUM('interested','not_interested','callback','converted','no_answer','busy'), allowNull: false },
  notes: { type: DataTypes.TEXT },
  followUpDate: { type: DataTypes.DATEONLY },
  followUpCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  driverOnboardingId: { type: DataTypes.INTEGER },
  paymentCollected: { type: DataTypes.BOOLEAN, defaultValue: false },
  paymentAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  callDuration: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, modelName: 'CallLog', tableName: 'call_logs' });

// ─────────────────────────────────────────────────────────────
// PAYMENT COLLECTION MODEL
// ─────────────────────────────────────────────────────────────
export class PaymentCollection extends Model {
  declare id: number;
  declare employeeId: number;
  declare collectionType: 'field' | 'calling';
  declare driverName: string;
  declare driverPhone: string;
  declare driverOnboardingId: number;
  declare amount: number;
  declare paymentMethod: 'cash' | 'upi' | 'other';
  declare upiTransactionId: string;
  declare notes: string;
  declare receiptPhotoUrl: string;
  declare verifiedByAdmin: boolean;
  declare verifiedAt: Date;
  declare createdAt: Date;
}
PaymentCollection.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  collectionType: { type: DataTypes.ENUM('field','calling'), allowNull: false },
  driverName: { type: DataTypes.STRING(150), allowNull: false },
  driverPhone: { type: DataTypes.STRING(20), allowNull: false },
  driverOnboardingId: { type: DataTypes.INTEGER },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentMethod: { type: DataTypes.ENUM('cash','upi','other'), defaultValue: 'cash' },
  upiTransactionId: { type: DataTypes.STRING(200) },
  notes: { type: DataTypes.TEXT },
  receiptPhotoUrl: { type: DataTypes.STRING(500) },
  verifiedByAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  verifiedAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'PaymentCollection', tableName: 'payment_collections' });

// ─────────────────────────────────────────────────────────────
// DAILY REPORT MODEL
// ─────────────────────────────────────────────────────────────
export class DailyReport extends Model {
  declare id: number;
  declare employeeId: number;
  declare reportDate: string;
  declare zonesVisited: string;
  declare driversContacted: number;
  declare driversOnboarded: number;
  declare retailersVisited: number;
  declare retailersOnboarded: number;
  declare ordersGenerated: number;
  declare callsMade: number;
  declare conversions: number;
  declare paymentsCollected: number;
  declare totalPaymentAmount: number;
  declare opsIssuesSolved: number;
  declare issuesFaced: string;
  declare tomorrowPlan: string;
  declare additionalNotes: string;
  declare targetAchievementPercent: number;
  declare adminRemarks: string;
  declare createdAt: Date;
}
DailyReport.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  reportDate: { type: DataTypes.DATEONLY, allowNull: false },
  zonesVisited: { type: DataTypes.TEXT },
  driversContacted: { type: DataTypes.INTEGER, defaultValue: 0 },
  driversOnboarded: { type: DataTypes.INTEGER, defaultValue: 0 },
  retailersVisited: { type: DataTypes.INTEGER, defaultValue: 0 },
  retailersOnboarded: { type: DataTypes.INTEGER, defaultValue: 0 },
  ordersGenerated: { type: DataTypes.INTEGER, defaultValue: 0 },
  callsMade: { type: DataTypes.INTEGER, defaultValue: 0 },
  conversions: { type: DataTypes.INTEGER, defaultValue: 0 },
  paymentsCollected: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalPaymentAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  opsIssuesSolved: { type: DataTypes.INTEGER, defaultValue: 0 },
  issuesFaced: { type: DataTypes.TEXT },
  tomorrowPlan: { type: DataTypes.TEXT },
  additionalNotes: { type: DataTypes.TEXT },
  targetAchievementPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  adminRemarks: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'DailyReport', tableName: 'daily_reports',
  indexes: [{ unique: true, fields: ['employeeId', 'reportDate'] }] });

// ─────────────────────────────────────────────────────────────
// LEADERBOARD POINTS LEDGER
// ─────────────────────────────────────────────────────────────
export class PointsLedger extends Model {
  declare id: number;
  declare employeeId: number;
  declare points: number;
  declare action: string;
  declare description: string;
  declare referenceType: string;
  declare referenceId: number;
  declare month: number;
  declare year: number;
  declare awardedBy: number;
  declare createdAt: Date;
}
PointsLedger.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  points: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  referenceType: { type: DataTypes.STRING(50) },
  referenceId: { type: DataTypes.INTEGER },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  awardedBy: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'PointsLedger', tableName: 'points_ledger',
  indexes: [{ fields: ['employeeId', 'month', 'year'] }] });

// ─────────────────────────────────────────────────────────────
// EMPLOYEE OF THE MONTH
// ─────────────────────────────────────────────────────────────
export class EmployeeOfMonth extends Model {
  declare id: number;
  declare employeeId: number;
  declare month: number;
  declare year: number;
  declare totalPoints: number;
  declare jobType: string;
  declare isCompanyWide: boolean;
  declare aiRecommendation: string;
  declare aiExplanation: string;
  declare adminSelectedBy: number;
  declare bonusAmount: number;
  declare certificateUrl: string;
  declare announcedAt: Date;
}
EmployeeOfMonth.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  totalPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  jobType: { type: DataTypes.STRING(50) },
  isCompanyWide: { type: DataTypes.BOOLEAN, defaultValue: false },
  aiRecommendation: { type: DataTypes.TEXT },
  aiExplanation: { type: DataTypes.TEXT },
  adminSelectedBy: { type: DataTypes.INTEGER },
  bonusAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  certificateUrl: { type: DataTypes.STRING(500) },
  announcedAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'EmployeeOfMonth', tableName: 'employee_of_month' });

// ─────────────────────────────────────────────────────────────
// NOTICE MODEL (All Employees)
// ─────────────────────────────────────────────────────────────
export class Notice extends Model {
  declare id: number;
  declare title: string;
  declare content: string;
  declare priority: 'urgent' | 'general' | 'announcement';
  declare createdBy: number;
  declare expiresAt: Date;
  declare isActive: boolean;
  declare createdAt: Date;
}
Notice.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  priority: { type: DataTypes.ENUM('urgent','general','announcement'), defaultValue: 'general' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'Notice', tableName: 'notices' });

// ─────────────────────────────────────────────────────────────
// NOTE MODEL (Selected Employees - 2 way)
// ─────────────────────────────────────────────────────────────
export class Note extends Model {
  declare id: number;
  declare title: string;
  declare content: string;
  declare createdBy: number;
  declare createdByRole: 'admin' | 'employee';
  declare isActive: boolean;
  declare createdAt: Date;
}
Note.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
  createdByRole: { type: DataTypes.ENUM('admin','employee'), defaultValue: 'admin' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'Note', tableName: 'notes' });

export class NoteRecipient extends Model {
  declare id: number;
  declare noteId: number;
  declare employeeId: number;
  declare isRead: boolean;
  declare readAt: Date;
}
NoteRecipient.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  noteId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'NoteRecipient', tableName: 'note_recipients' });

export class NoteReply extends Model {
  declare id: number;
  declare noteId: number;
  declare senderId: number;
  declare senderRole: 'admin' | 'employee';
  declare senderName: string;
  declare content: string;
  declare createdAt: Date;
}
NoteReply.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  noteId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  senderRole: { type: DataTypes.ENUM('admin','employee'), allowNull: false },
  senderName: { type: DataTypes.STRING(100), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
}, { sequelize, modelName: 'NoteReply', tableName: 'note_replies' });

// ─────────────────────────────────────────────────────────────
// WARNING MODEL
// ─────────────────────────────────────────────────────────────
export class Warning extends Model {
  declare id: number;
  declare employeeId: number;
  declare issuedBy: number;
  declare type: 'verbal' | 'written' | 'final' | 'notice';
  declare severity: 'low' | 'medium' | 'high' | 'critical';
  declare subject: string;
  declare description: string;
  declare isAiGenerated: boolean;
  declare acknowledgedAt: Date;
  declare createdAt: Date;
}
Warning.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  issuedBy: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('verbal','written','final','notice'), allowNull: false },
  severity: { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
  subject: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  isAiGenerated: { type: DataTypes.BOOLEAN, defaultValue: false },
  acknowledgedAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'Warning', tableName: 'warnings' });

// ─────────────────────────────────────────────────────────────
// SALARY MODEL
// ─────────────────────────────────────────────────────────────
export class SalaryRecord extends Model {
  declare id: number;
  declare employeeId: number;
  declare month: number;
  declare year: number;
  declare workingDays: number;
  declare presentDays: number;
  declare absentDays: number;
  declare lateMinutes: number;
  declare basicSalary: number;
  declare absentDeduction: number;
  declare lateDeduction: number;
  declare netSalary: number;
  declare bonus: number;
  declare bonusReason: string;
  declare adjustment: number;
  declare adjustmentReason: string;
  declare totalPayout: number;
  declare status: 'draft' | 'approved' | 'paid';
  declare approvedBy: number;
  declare approvedAt: Date;
  declare paidAt: Date;
  declare createdAt: Date;
}
SalaryRecord.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  workingDays: { type: DataTypes.INTEGER, defaultValue: 26 },
  presentDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  absentDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  lateMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  basicSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  absentDeduction: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  lateDeduction: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  netSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  bonus: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  bonusReason: { type: DataTypes.STRING(300) },
  adjustment: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  adjustmentReason: { type: DataTypes.STRING(300) },
  totalPayout: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('draft','approved','paid'), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER },
  approvedAt: { type: DataTypes.DATE },
  paidAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'SalaryRecord', tableName: 'salary_records',
  indexes: [{ unique: true, fields: ['employeeId', 'month', 'year'] }] });

export class SalaryHistory extends Model {
  declare id: number;
  declare employeeId: number;
  declare changeType: 'hike' | 'bonus' | 'adjustment' | 'initial';
  declare previousSalary: number;
  declare newSalary: number;
  declare changeAmount: number;
  declare reason: string;
  declare effectiveDate: string;
  declare changedBy: number;
  declare createdAt: Date;
}
SalaryHistory.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  changeType: { type: DataTypes.ENUM('hike','bonus','adjustment','initial'), allowNull: false },
  previousSalary: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  newSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  changeAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reason: { type: DataTypes.TEXT },
  effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
  changedBy: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, modelName: 'SalaryHistory', tableName: 'salary_history' });

// ─────────────────────────────────────────────────────────────
// TARGET MODEL
// ─────────────────────────────────────────────────────────────
export class Target extends Model {
  declare id: number;
  declare employeeId: number;
  declare title: string;
  declare targetType: 'daily' | 'weekly' | 'monthly';
  declare metric: string;
  declare targetValue: number;
  declare achievedValue: number;
  declare unit: string;
  declare month: number;
  declare year: number;
  declare week: number;
  declare status: 'active' | 'achieved' | 'failed' | 'partial';
  declare points: number;
  declare createdBy: number;
  declare createdAt: Date;
}
Target.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  targetType: { type: DataTypes.ENUM('daily','weekly','monthly'), allowNull: false },
  metric: { type: DataTypes.STRING(100), allowNull: false },
  targetValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  achievedValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  unit: { type: DataTypes.STRING(50), defaultValue: 'count' },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  week: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active','achieved','failed','partial'), defaultValue: 'active' },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdBy: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'Target', tableName: 'targets' });

// ─────────────────────────────────────────────────────────────
// LEAVE REQUEST MODEL
// ─────────────────────────────────────────────────────────────
export class LeaveRequest extends Model {
  declare id: number;
  declare employeeId: number;
  declare leaveType: string;
  declare startDate: string;
  declare endDate: string;
  declare days: number;
  declare reason: string;
  declare status: 'pending' | 'approved' | 'rejected';
  declare reviewedBy: number;
  declare reviewNote: string;
  declare reviewedAt: Date;
  declare createdAt: Date;
}
LeaveRequest.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  leaveType: { type: DataTypes.ENUM('paid','unpaid','sick','casual','emergency'), allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  days: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  reviewedBy: { type: DataTypes.INTEGER },
  reviewNote: { type: DataTypes.TEXT },
  reviewedAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'LeaveRequest', tableName: 'leave_requests' });

// ─────────────────────────────────────────────────────────────
// EXPENSE CLAIM MODEL
// ─────────────────────────────────────────────────────────────
export class ExpenseClaim extends Model {
  declare id: number;
  declare employeeId: number;
  declare expenseType: string;
  declare amount: number;
  declare description: string;
  declare expenseDate: string;
  declare receiptUrl: string;
  declare status: 'pending' | 'approved' | 'rejected';
  declare reviewedBy: number;
  declare reviewNote: string;
  declare reviewedAt: Date;
  declare createdAt: Date;
}
ExpenseClaim.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  expenseType: { type: DataTypes.ENUM('petrol','food','travel','accommodation','other'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
  receiptUrl: { type: DataTypes.STRING(500) },
  status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  reviewedBy: { type: DataTypes.INTEGER },
  reviewNote: { type: DataTypes.TEXT },
  reviewedAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'ExpenseClaim', tableName: 'expense_claims' });

// ─────────────────────────────────────────────────────────────
// NOTIFICATION MODEL
// ─────────────────────────────────────────────────────────────
export class Notification extends Model {
  declare id: number;
  declare recipientId: number;
  declare recipientRole: 'admin' | 'employee';
  declare type: string;
  declare title: string;
  declare body: string;
  declare data: string;
  declare isRead: boolean;
  declare readAt: Date;
  declare createdAt: Date;
}
Notification.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  recipientId: { type: DataTypes.INTEGER, allowNull: false },
  recipientRole: { type: DataTypes.ENUM('admin','employee'), allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  data: { type: DataTypes.TEXT },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'Notification', tableName: 'notifications',
  indexes: [{ fields: ['recipientId', 'isRead'] }] });

// ─────────────────────────────────────────────────────────────
// APP CONFIG MODEL
// ─────────────────────────────────────────────────────────────
export class AppConfig extends Model {
  declare id: number;
  declare configKey: string;
  declare configValue: string;
  declare updatedBy: number;
  declare updatedAt: Date;
}
AppConfig.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  configKey: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  configValue: { type: DataTypes.TEXT, allowNull: false },
  updatedBy: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'AppConfig', tableName: 'app_config' });

// ─────────────────────────────────────────────────────────────
// TEAMWORK BONUS REQUEST
// ─────────────────────────────────────────────────────────────
export class TeamworkBonus extends Model {
  declare id: number;
  declare employeeId: number;
  declare helpedZoneId: number;
  declare description: string;
  declare status: 'pending' | 'approved' | 'rejected';
  declare points: number;
  declare reviewedBy: number;
  declare reviewNote: string;
  declare createdAt: Date;
}
TeamworkBonus.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  helpedZoneId: { type: DataTypes.INTEGER },
  description: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  points: { type: DataTypes.INTEGER, defaultValue: 5 },
  reviewedBy: { type: DataTypes.INTEGER },
  reviewNote: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'TeamworkBonus', tableName: 'teamwork_bonus' });

// ─────────────────────────────────────────────────────────────
// AUDIT LOG MODEL
// ─────────────────────────────────────────────────────────────
export class AuditLog extends Model {
  declare id: number;
  declare userId: number;
  declare userRole: string;
  declare action: string;
  declare module: string;
  declare details: string;
  declare ipAddress: string;
  declare createdAt: Date;
}
AuditLog.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  userRole: { type: DataTypes.STRING(30), allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  module: { type: DataTypes.STRING(50) },
  details: { type: DataTypes.TEXT },
  ipAddress: { type: DataTypes.STRING(50) },
}, { sequelize, modelName: 'AuditLog', tableName: 'audit_logs',
  updatedAt: false });

// ─────────────────────────────────────────────────────────────
// ASSOCIATIONS
// ─────────────────────────────────────────────────────────────
export const setupAssociations = (): void => {
  Employee.belongsToMany(Zone, { through: EmployeeZone, foreignKey: 'employeeId' });
  Zone.belongsToMany(Employee, { through: EmployeeZone, foreignKey: 'zoneId' });

  Employee.hasMany(Attendance, { foreignKey: 'employeeId' });
  Attendance.belongsTo(Employee, { foreignKey: 'employeeId' });

  Employee.hasMany(LocationLog, { foreignKey: 'employeeId' });
  Employee.hasMany(DriverOnboarding, { foreignKey: 'employeeId' });
  Employee.hasMany(RetailerOnboarding, { foreignKey: 'employeeId' });
  Employee.hasMany(CallLog, { foreignKey: 'employeeId' });
  Employee.hasMany(PaymentCollection, { foreignKey: 'employeeId' });
  Employee.hasMany(DailyReport, { foreignKey: 'employeeId' });
  Employee.hasMany(PointsLedger, { foreignKey: 'employeeId' });
  Employee.hasMany(Warning, { foreignKey: 'employeeId' });
  Employee.hasMany(SalaryRecord, { foreignKey: 'employeeId' });
  Employee.hasMany(SalaryHistory, { foreignKey: 'employeeId' });
  Employee.hasMany(Target, { foreignKey: 'employeeId' });
  Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId' });
  Employee.hasMany(ExpenseClaim, { foreignKey: 'employeeId' });

  Note.hasMany(NoteRecipient, { foreignKey: 'noteId' });
  Note.hasMany(NoteReply, { foreignKey: 'noteId' });

  Zone.hasMany(LocationLog, { foreignKey: 'zoneId' });
  Zone.hasMany(DriverOnboarding, { foreignKey: 'zoneId' });
  Zone.hasMany(RetailerOnboarding, { foreignKey: 'zoneId' });
};
