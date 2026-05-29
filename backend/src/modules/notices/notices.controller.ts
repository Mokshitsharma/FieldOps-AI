import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Notice, Note, NoteRecipient, NoteReply, Employee } from '../../models';
import { broadcastToAllEmployees, sendNotificationToEmployee } from '../../utils/notify';

// ════════════════════════════════════════════════════════════════
// NOTICES — All Employees
// ════════════════════════════════════════════════════════════════

export const createNotice = async (req: Request, res: Response): Promise<void> => {
  const { title, content, priority } = req.body;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Auto-expire after 30 days

  const notice = await Notice.create({
    title, content,
    priority: priority || 'general',
    createdBy: req.user!.id,
    expiresAt,
    isActive: true,
  });

  // Broadcast to all employees
  await broadcastToAllEmployees({
    type: 'notice',
    title: `📢 ${priority === 'urgent' ? '🚨 URGENT: ' : ''}${title}`,
    body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    data: { noticeId: notice.id, priority },
  });

  res.status(201).json({ success: true, message: 'Notice posted to all employees', data: notice });
};

export const getNotices = async (req: Request, res: Response): Promise<void> => {
  const { priority, includeExpired, page = 1, limit = 20 } = req.query;
  const where: any = { isActive: true };

  if (!includeExpired || includeExpired !== 'true') {
    where.expiresAt = { [Op.gt]: new Date() };
  }
  if (priority) where.priority = priority;

  const { count, rows } = await Notice.findAndCountAll({
    where,
    order: [['priority', 'ASC'], ['createdAt', 'DESC']], // urgent first
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const deleteNotice = async (req: Request, res: Response): Promise<void> => {
  const notice = await Notice.findByPk(req.params.id);
  if (!notice) { res.status(404).json({ success: false, message: 'Notice not found' }); return; }
  notice.isActive = false;
  await notice.save();
  res.json({ success: true, message: 'Notice removed' });
};

// ════════════════════════════════════════════════════════════════
// NOTES — Selected Employees (2-way)
// ════════════════════════════════════════════════════════════════

export const sendNote = async (req: Request, res: Response): Promise<void> => {
  const { title, content, recipientIds } = req.body;

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    res.status(400).json({ success: false, message: 'At least one recipient required' });
    return;
  }

  const note = await Note.create({
    title, content,
    createdBy: req.user!.id,
    createdByRole: req.user!.role === 'employee' ? 'employee' : 'admin',
    isActive: true,
  });

  // Create recipient records
  await NoteRecipient.bulkCreate(
    recipientIds.map((empId: number) => ({ noteId: note.id, employeeId: empId, isRead: false }))
  );

  // Notify each recipient
  for (const empId of recipientIds) {
    await sendNotificationToEmployee(empId, {
      type: 'note',
      title: `💬 New note from Admin`,
      body: title,
      data: { noteId: note.id },
    });
  }

  res.status(201).json({ success: true, message: 'Note sent', data: { id: note.id, title, recipientCount: recipientIds.length } });
};

export const getMyNotes = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;
  const employeeId = req.user!.id;

  // Get note IDs where employee is a recipient
  const recipientRecords = await NoteRecipient.findAll({
    where: { employeeId },
    attributes: ['noteId', 'isRead', 'readAt'],
  });
  const noteIds = recipientRecords.map(r => r.noteId);

  if (noteIds.length === 0) {
    res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: Number(limit), totalPages: 0 } });
    return;
  }

  const readMap: Record<number, boolean> = {};
  recipientRecords.forEach(r => { readMap[r.noteId] = r.isRead; });

  const { count, rows } = await Note.findAndCountAll({
    where: { id: noteIds, isActive: true },
    include: [{ model: NoteReply, separate: true, order: [['createdAt', 'ASC']] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  const data = rows.map((n: any) => ({ ...n.toJSON(), isRead: readMap[n.id] || false }));
  res.json({ success: true, data, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const getAdminNotes = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;

  const { count, rows } = await Note.findAndCountAll({
    where: { isActive: true },
    include: [
      { model: NoteRecipient, include: [{ model: Employee, attributes: ['name', 'employeeId'] }] },
      { model: NoteReply, separate: true, order: [['createdAt', 'ASC']] },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) } });
};

export const replyToNote = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { content } = req.body;

  const note = await Note.findByPk(id);
  if (!note) { res.status(404).json({ success: false, message: 'Note not found' }); return; }

  // Employee can only reply to notes they received
  if (req.user!.role === 'employee') {
    const recipient = await NoteRecipient.findOne({ where: { noteId: id, employeeId: req.user!.id } });
    if (!recipient) { res.status(403).json({ success: false, message: 'Not a recipient of this note' }); return; }

    // Mark as read
    if (!recipient.isRead) {
      recipient.isRead = true;
      recipient.readAt = new Date();
      await recipient.save();
    }
  }

  const reply = await NoteReply.create({
    noteId: Number(id),
    senderId: req.user!.id,
    senderRole: req.user!.role === 'employee' ? 'employee' : 'admin',
    senderName: req.user!.name,
    content,
  });

  // Notify the other party
  if (req.user!.role === 'employee') {
    // Notify admin (use employee's own ID as placeholder — admin sees in dashboard)
    // In real app, notify the admin who created the note
    const adminId = note.createdBy;
  } else {
    // Notify all recipients
    const recipients = await NoteRecipient.findAll({ where: { noteId: id } });
    for (const r of recipients) {
      await sendNotificationToEmployee(r.employeeId, {
        type: 'note_reply',
        title: '💬 Admin replied to your note',
        body: content.substring(0, 80),
        data: { noteId: id },
      });
    }
  }

  res.status(201).json({ success: true, message: 'Reply sent', data: reply });
};

export const markNoteRead = async (req: Request, res: Response): Promise<void> => {
  await NoteRecipient.update(
    { isRead: true, readAt: new Date() },
    { where: { noteId: req.params.id, employeeId: req.user!.id } }
  );
  res.json({ success: true, message: 'Marked as read' });
};
