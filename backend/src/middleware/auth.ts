import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Employee, Admin } from '../models';

export interface AuthUser {
  id: number;
  role: 'admin' | 'employee' | 'superadmin' | 'manager';
  email: string;
  name: string;
  jobType?: string;
}

declare global {
  namespace Express {
    interface Request { user?: AuthUser; }
  }
}

export const generateTokenPair = (payload: Omit<AuthUser, 'name'>) => {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
};

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthUser;

    // Verify user still exists and is active
    if (decoded.role === 'employee') {
      const emp = await Employee.findOne({ where: { id: decoded.id, isActive: true } });
      if (!emp) { res.status(401).json({ success: false, message: 'Account deactivated' }); return; }
      req.user = { ...decoded, name: emp.name, jobType: emp.jobType };
    } else {
      const admin = await Admin.findOne({ where: { id: decoded.id, isActive: true } });
      if (!admin) { res.status(401).json({ success: false, message: 'Account deactivated' }); return; }
      req.user = { ...decoded, name: admin.name };
    }
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role === 'employee') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
};

export const authorizeFieldOfficer = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'employee' && req.user.jobType !== 'field_officer') {
    res.status(403).json({ success: false, message: 'Field Officer access required' });
    return;
  }
  next();
};
