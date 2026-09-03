import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import staffRoutes from './routes/staff.routes.js';
import membersRoutes from './routes/members.routes.js';
import plansRoutes from './routes/plans.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import announcementsRoutes from './routes/announcements.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import activityLogsRoutes from './routes/activityLogs.routes.js';
import memberRoutes from './routes/member.routes.js';

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/member', memberRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
