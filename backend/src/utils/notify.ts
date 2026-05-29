import { Notification, Employee } from '../models';
import axios from 'axios';
import { logger } from './logger';

interface NotifPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotificationToEmployee = async (
  employeeId: number,
  payload: NotifPayload,
  io?: any
): Promise<void> => {
  try {
    // Save to DB
    const notif = await Notification.create({
      recipientId: employeeId,
      recipientRole: 'employee',
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? JSON.stringify(payload.data) : null,
    });

    // Real-time via Socket.io
    if (io) {
      io.to(`user:${employeeId}`).emit('notification:new', notif);
    }

    // FCM push
    const emp = await Employee.findByPk(employeeId, { attributes: ['fcmToken'] });
    if (emp?.fcmToken && process.env.FCM_SERVER_KEY) {
      await sendFCM(emp.fcmToken, payload.title, payload.body, payload.data);
    }
  } catch (err) {
    logger.error('Notification failed:', err);
  }
};

export const broadcastToAllEmployees = async (
  payload: NotifPayload,
  io?: any
): Promise<void> => {
  try {
    const employees = await Employee.findAll({ where: { isActive: true }, attributes: ['id', 'fcmToken'] });

    const notifs = employees.map(emp => ({
      recipientId: emp.id,
      recipientRole: 'employee' as const,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? JSON.stringify(payload.data) : null,
    }));

    await Notification.bulkCreate(notifs);

    if (io) {
      io.to('employees').emit('notification:new', { ...payload });
    }

    // Batch FCM
    const fcmTokens = employees.map(e => e.fcmToken).filter(Boolean) as string[];
    if (fcmTokens.length > 0 && process.env.FCM_SERVER_KEY) {
      for (const token of fcmTokens) {
        await sendFCM(token, payload.title, payload.body, payload.data).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('Broadcast failed:', err);
  }
};

const sendFCM = async (token: string, title: string, body: string, data?: any): Promise<void> => {
  await axios.post('https://fcm.googleapis.com/fcm/send', {
    to: token,
    notification: { title, body, sound: 'default' },
    data: data || {},
    priority: 'high',
    android: { notification: { channel_id: 'movigo_main' } },
  }, {
    headers: { Authorization: `key=${process.env.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 5000,
  });
};
