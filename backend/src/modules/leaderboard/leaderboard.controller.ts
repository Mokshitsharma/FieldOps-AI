import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { PointsLedger, Employee, EmployeeOfMonth, AppConfig, TeamworkBonus } from '../../models';
import { getLeaderboard, awardPoints, POINT_ACTIONS } from '../../utils/pointsEngine';
import { broadcastToAllEmployees } from '../../utils/notify';
import axios from 'axios';

// ─── Get Leaderboard ──────────────────────────────────────────
export const getLeaderboardData = async (req: Request, res: Response): Promise<void> => {
  const { month, year, jobType, view = 'company' } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();

  if (view === 'company') {
    // All employees together
    const leaderboard = await getLeaderboard(m, y);
    res.json({ success: true, data: { type: 'company', month: m, year: y, leaderboard } });
  } else if (view === 'role') {
    // Separate by job type
    const [foBoard, ctBoard] = await Promise.all([
      getLeaderboard(m, y, 'field_officer'),
      getLeaderboard(m, y, 'calling_team'),
    ]);
    res.json({ success: true, data: { type: 'role', month: m, year: y, fieldOfficers: foBoard, callingTeam: ctBoard } });
  }
};

// ─── Get My Points History ────────────────────────────────────
export const getMyPoints = async (req: Request, res: Response): Promise<void> => {
  const { month, year, page = 1, limit = 30 } = req.query;
  const where: any = { employeeId: req.user!.id };

  if (month && year) { where.month = Number(month); where.year = Number(year); }

  const { count, rows } = await PointsLedger.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  const total = await PointsLedger.sum('points', { where }) || 0;

  res.json({ success: true, data: { ledger: rows, totalPoints: total } });
};

// ─── My Rank ──────────────────────────────────────────────────
export const getMyRank = async (req: Request, res: Response): Promise<void> => {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();

  const [companyBoard, roleBoard] = await Promise.all([
    getLeaderboard(m, y),
    getLeaderboard(m, y, req.user!.jobType as any),
  ]);

  const companyRank = companyBoard.findIndex(e => e.employeeId === req.user!.id) + 1;
  const roleRank = roleBoard.findIndex(e => e.employeeId === req.user!.id) + 1;
  const myPoints = companyBoard.find(e => e.employeeId === req.user!.id)?.totalPoints || 0;

  res.json({ success: true, data: {
    companyRank: companyRank || 'Unranked',
    roleRank: roleRank || 'Unranked',
    totalParticipants: companyBoard.length,
    myPoints,
    month: m, year: y,
  }});
};

// ─── Submit Teamwork Bonus Request ───────────────────────────
export const submitTeamworkBonus = async (req: Request, res: Response): Promise<void> => {
  const { helpedZoneId, description } = req.body;

  const request = await TeamworkBonus.create({
    employeeId: req.user!.id,
    helpedZoneId: helpedZoneId || null,
    description,
    status: 'pending',
  });

  res.status(201).json({ success: true, message: 'Teamwork bonus request submitted. Pending admin review.', data: request });
};

// ─── Admin: Review teamwork bonus ────────────────────────────
export const reviewTeamworkBonus = async (req: Request, res: Response): Promise<void> => {
  const { status, reviewNote } = req.body;
  const request = await TeamworkBonus.findByPk(req.params.id);
  if (!request) { res.status(404).json({ success: false, message: 'Request not found' }); return; }

  request.status = status;
  request.reviewedBy = req.user!.id;
  request.reviewNote = reviewNote;
  await request.save();

  if (status === 'approved') {
    await awardPoints(
      request.employeeId,
      POINT_ACTIONS.TEAMWORK_BONUS,
      `Teamwork bonus approved: ${request.description}`,
      'teamwork_bonus',
      request.id,
      req.user!.id
    );
  }

  res.json({ success: true, message: `Teamwork bonus ${status}` });
};

// ─── Admin: AI Employee of Month Recommendation ───────────────
export const getEmployeeOfMonthRecommendation = async (req: Request, res: Response): Promise<void> => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();

  // Get leaderboard data
  const [companyBoard, foBoard, ctBoard] = await Promise.all([
    getLeaderboard(m, y),
    getLeaderboard(m, y, 'field_officer'),
    getLeaderboard(m, y, 'calling_team'),
  ]);

  if (companyBoard.length === 0) {
    res.json({ success: true, data: { message: 'No employee data for this month yet' } });
    return;
  }

  const topCompany = companyBoard[0];
  const topFO = foBoard[0];
  const topCT = ctBoard[0];

  // Prepare data for AI analysis
  const analysisData = {
    month: m, year: y,
    companyWinner: topCompany,
    foWinner: topFO,
    ctWinner: topCT,
    top5Company: companyBoard.slice(0, 5),
  };

  let aiExplanation = '';
  try {
    const provider = process.env.AI_PROVIDER || 'gemini';
    const prompt = `You are an HR analytics AI for Movigo Innovations, a logistics startup similar to Porter.

Analyze this month's employee performance data and explain why each candidate deserves "Employee of the Month":

Company-Wide Winner: ${topCompany?.name} (${topCompany?.jobType?.replace('_', ' ')}) - ${topCompany?.totalPoints} points
Field Officer Winner: ${topFO?.name} - ${topFO?.totalPoints} points  
Calling Team Winner: ${topCT?.name} - ${topCT?.totalPoints} points

Top 5 Company-Wide:
${companyBoard.slice(0, 5).map((e, i) => `${i + 1}. ${e.name} (${e.jobType?.replace('_', ' ')}) - ${e.totalPoints} pts`).join('\n')}

Points are earned through: driver onboardings, retailer onboardings, payment collections, call conversions, daily reports, attendance, and target achievements.

Provide:
1. Why the company-wide winner deserves the award (2-3 sentences)
2. Why the FO winner deserves the FO category award
3. Why the CT winner deserves the CT category award
4. One motivational note to the whole team

Keep it professional, encouraging, and specific. Mention their point totals.`;

    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { timeout: 15000 }
      );
      aiExplanation = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  } catch (err) {
    aiExplanation = 'AI analysis unavailable. Please review the leaderboard data manually.';
  }

  res.json({
    success: true,
    data: {
      month: m, year: y,
      recommendations: {
        companyWide: { employee: topCompany, category: 'Company Wide' },
        fieldOfficer: { employee: topFO, category: 'Field Officer' },
        callingTeam: { employee: topCT, category: 'Calling Team' },
      },
      aiExplanation,
      leaderboard: { company: companyBoard.slice(0, 10), fieldOfficers: foBoard.slice(0, 5), callingTeam: ctBoard.slice(0, 5) },
    },
  });
};

// ─── Admin: Confirm Employee of Month ────────────────────────
export const confirmEmployeeOfMonth = async (req: Request, res: Response): Promise<void> => {
  const { employeeId, month, year, category, bonusAmount, aiExplanation } = req.body;
  const isCompanyWide = category === 'company';

  // Check already selected
  const existing = await EmployeeOfMonth.findOne({
    where: { month, year, isCompanyWide, ...(isCompanyWide ? {} : { jobType: category }) }
  });
  if (existing) {
    res.status(409).json({ success: false, message: 'Employee of Month already selected for this category' });
    return;
  }

  const emp = await Employee.findByPk(employeeId);
  if (!emp) { res.status(404).json({ success: false, message: 'Employee not found' }); return; }

  const m = Number(month);
  const y = Number(year);
  const points = await PointsLedger.sum('points', { where: { employeeId, month: m, year: y } }) || 0;

  const winner = await EmployeeOfMonth.create({
    employeeId,
    month: m,
    year: y,
    totalPoints: points,
    jobType: emp.jobType,
    isCompanyWide: isCompanyWide,
    aiExplanation: aiExplanation || '',
    adminSelectedBy: req.user!.id,
    bonusAmount: bonusAmount || 0,
    announcedAt: new Date(),
  });

  // Broadcast announcement to all employees
  const categoryLabel = isCompanyWide ? 'Company' : emp.jobType === 'field_officer' ? 'Field Officer' : 'Calling Team';
  await broadcastToAllEmployees({
    type: 'employee_of_month',
    title: `🏆 ${categoryLabel} Employee of the Month!`,
    body: `Congratulations to ${emp.name} for being selected as ${categoryLabel} Employee of the Month for ${m}/${y}! 🎉`,
    data: { winnerId: employeeId, category: categoryLabel, points },
  });

  // Award bonus points
  if (bonusAmount > 0) {
    await awardPoints(employeeId, POINT_ACTIONS.MANUAL_ADJUSTMENT,
      `Employee of the Month - ${categoryLabel}`, 'employee_of_month', winner.id,
      req.user!.id, 50);
  }

  res.json({ success: true, message: `${emp.name} selected as ${categoryLabel} Employee of the Month!`, data: winner });
};

// ─── Get Employee of Month History ───────────────────────────
export const getEmployeeOfMonthHistory = async (req: Request, res: Response): Promise<void> => {
  const { year } = req.query;
  const where: any = {};
  if (year) where.year = year;

  const winners = await EmployeeOfMonth.findAll({
    where,
    include: [{ model: Employee, attributes: ['name', 'employeeId', 'jobType', 'avatar'] }],
    order: [['year', 'DESC'], ['month', 'DESC']],
  });

  res.json({ success: true, data: winners });
};
