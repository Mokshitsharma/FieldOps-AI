import { PointsLedger, Employee, AppConfig } from '../models';
import { logger } from './logger';

// ─── Points action types ──────────────────────────────────────
export const POINT_ACTIONS = {
  NEW_DRIVER_ONBOARDED: 'new_driver_onboarded',
  DRIVER_PAYMENT_FIELD: 'driver_payment_field',
  DRIVER_PAYMENT_CALLING: 'driver_payment_calling',
  NEW_RETAILER_ONBOARDED: 'new_retailer_onboarded',
  ORDER_GENERATED: 'order_generated',
  ORDER_ASSIGNED_DRIVER: 'order_assigned_driver',
  FOLLOWUP_VISIT: 'followup_visit',
  CALL_LOGGED: 'call_logged',
  CALL_CONVERTED: 'call_converted',
  FOLLOWUP_CALL_COMPLETED: 'followup_call_completed',
  DAILY_REPORT_SUBMITTED: 'daily_report_submitted',
  DAILY_REPORT_MISSING: 'daily_report_missing',
  PERFECT_ATTENDANCE: 'perfect_monthly_attendance',
  ON_TIME_CHECKIN: 'on_time_checkin',
  LATE_CHECKIN: 'late_checkin',
  OPS_ISSUE_SOLVED: 'ops_issue_solved',
  TEAMWORK_BONUS: 'teamwork_bonus',
  WEEKLY_TARGET_ACHIEVED: 'weekly_target_achieved',
  MONTHLY_TARGET_ACHIEVED: 'monthly_target_achieved',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
} as const;

// ─── Get points config from DB ────────────────────────────────
const getPointsConfig = async (): Promise<Record<string, number>> => {
  try {
    const config = await AppConfig.findOne({ where: { configKey: 'pointsConfig' } });
    if (config) return JSON.parse(config.configValue);
  } catch {}
  return {
    newDriverOnboarded: 10,
    driverPaymentFieldCollection: 25,
    driverPaymentCallingCollection: 20,
    newRetailerOnboarded: 15,
    orderGenerated: 10,
    orderAssignedToDriver: 8,
    followUpVisit: 5,
    callLogged: 2,
    callConverted: 15,
    followUpCallCompleted: 5,
    dailyReportSubmitted: 5,
    dailyReportMissing: -5,
    perfectMonthlyAttendance: 20,
    onTimeCheckIn: 2,
    lateCheckIn: -2,
    opsIssueSolved: 5,
    teamworkBonus: 5,
    weeklyTargetAchieved: 15,
    monthlyTargetAchieved: 30,
  };
};

// ─── Award points to an employee ─────────────────────────────
export const awardPoints = async (
  employeeId: number,
  action: string,
  description: string,
  referenceType?: string,
  referenceId?: number,
  awardedBy?: number,
  overridePoints?: number
): Promise<number> => {
  try {
    const config = await getPointsConfig();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Map action to config key
    const actionToConfigKey: Record<string, string> = {
      [POINT_ACTIONS.NEW_DRIVER_ONBOARDED]: 'newDriverOnboarded',
      [POINT_ACTIONS.DRIVER_PAYMENT_FIELD]: 'driverPaymentFieldCollection',
      [POINT_ACTIONS.DRIVER_PAYMENT_CALLING]: 'driverPaymentCallingCollection',
      [POINT_ACTIONS.NEW_RETAILER_ONBOARDED]: 'newRetailerOnboarded',
      [POINT_ACTIONS.ORDER_GENERATED]: 'orderGenerated',
      [POINT_ACTIONS.ORDER_ASSIGNED_DRIVER]: 'orderAssignedToDriver',
      [POINT_ACTIONS.FOLLOWUP_VISIT]: 'followUpVisit',
      [POINT_ACTIONS.CALL_LOGGED]: 'callLogged',
      [POINT_ACTIONS.CALL_CONVERTED]: 'callConverted',
      [POINT_ACTIONS.FOLLOWUP_CALL_COMPLETED]: 'followUpCallCompleted',
      [POINT_ACTIONS.DAILY_REPORT_SUBMITTED]: 'dailyReportSubmitted',
      [POINT_ACTIONS.DAILY_REPORT_MISSING]: 'dailyReportMissing',
      [POINT_ACTIONS.PERFECT_ATTENDANCE]: 'perfectMonthlyAttendance',
      [POINT_ACTIONS.ON_TIME_CHECKIN]: 'onTimeCheckIn',
      [POINT_ACTIONS.LATE_CHECKIN]: 'lateCheckIn',
      [POINT_ACTIONS.OPS_ISSUE_SOLVED]: 'opsIssueSolved',
      [POINT_ACTIONS.TEAMWORK_BONUS]: 'teamworkBonus',
      [POINT_ACTIONS.WEEKLY_TARGET_ACHIEVED]: 'weeklyTargetAchieved',
      [POINT_ACTIONS.MONTHLY_TARGET_ACHIEVED]: 'monthlyTargetAchieved',
    };

    const configKey = actionToConfigKey[action];
    const points = overridePoints !== undefined ? overridePoints : (config[configKey] || 0);

    if (points === 0) return 0;

    // Record in ledger
    await PointsLedger.create({
      employeeId,
      points,
      action,
      description,
      referenceType,
      referenceId,
      month,
      year,
      awardedBy,
    });

    // Update employee total and current month points
    const employee = await Employee.findByPk(employeeId);
    if (employee) {
      employee.totalPoints = (employee.totalPoints || 0) + points;
      employee.currentMonthPoints = (employee.currentMonthPoints || 0) + points;
      await employee.save();
    }

    logger.debug(`Points awarded: ${employeeId} | ${action} | ${points}pts`);
    return points;
  } catch (err) {
    logger.error('Points award failed:', err);
    return 0;
  }
};

// ─── Get leaderboard for a month ─────────────────────────────
export const getLeaderboard = async (
  month: number,
  year: number,
  jobType?: 'field_officer' | 'calling_team'
): Promise<any[]> => {
  const { Op } = require('sequelize');

  const whereClause: any = { month, year };
  const employeeWhere: any = { isActive: true };
  if (jobType) employeeWhere.jobType = jobType;

  const ledgerEntries = await PointsLedger.findAll({
    where: whereClause,
    attributes: [
      'employeeId',
      [require('sequelize').fn('SUM', require('sequelize').col('points')), 'totalPoints'],
    ],
    include: [{
      model: Employee,
      where: employeeWhere,
      attributes: ['name', 'employeeId', 'jobType', 'avatar'],
    }],
    group: ['employeeId'],
    order: [[require('sequelize').literal('totalPoints'), 'DESC']],
    raw: true,
    nest: true,
  });

  return ledgerEntries.map((entry: any, index: number) => ({
    rank: index + 1,
    employeeId: entry.employeeId,
    name: entry.Employee?.name,
    employeeCode: entry.Employee?.employeeId,
    jobType: entry.Employee?.jobType,
    avatar: entry.Employee?.avatar,
    totalPoints: parseInt(entry.totalPoints) || 0,
  }));
};
