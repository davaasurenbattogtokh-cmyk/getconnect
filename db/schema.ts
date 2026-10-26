// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const applications = sqliteTable('applications', {
 id: text('id').primaryKey(), token: text('token').notNull().unique(),
 company: text('company').notNull(), chapter: text('chapter').notNull(),
 sector: text('sector').notNull(), description: text('description').notNull(),
 audience: text('audience').notNull(), contact: text('contact').notNull(),
 position: text('position').notNull(), phone: text('phone').notNull(),
 email: text('email').notNull(), website: text('website').notNull(),
 logo: text('logo').notNull(), booths: text('booths').notNull(),
 meetings: text('meetings').notNull(), notes: text('notes').notNull(),
 status: text('status').notNull(), reason: text('reason').notNull(),
 createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
 expiresAt: integer('expires_at').notNull(),
 decisionKey: text('decision_key').notNull().default(''),
 ratePerSqm: integer('rate_per_sqm'),
 totalPrice: integer('total_price'),
});
export const reservations = sqliteTable('reservations', {
 boothId: text('booth_id').primaryKey(), applicationId: text('application_id').notNull().references(()=>applications.id),
});
export const settings = sqliteTable('settings', {key:text('key').primaryKey(), value:text('value').notNull()});
export const audit = sqliteTable('audit', {id:text('id').primaryKey(), applicationId:text('application_id').notNull(), actor:text('actor').notNull(), action:text('action').notNull(), detail:text('detail').notNull(), at:integer('at').notNull()});
export const mailOutbox = sqliteTable('mail_outbox', {id:text('id').primaryKey(), applicationId:text('application_id').notNull(), kind:text('kind').notNull(), recipient:text('recipient').notNull(), status:text('status').notNull(), error:text('error').notNull(), createdAt:integer('created_at').notNull()});
export const adminSessions = sqliteTable('admin_sessions', {tokenHash:text('token_hash').primaryKey(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()});
export const adminLoginAttempts = sqliteTable('admin_login_attempts', {key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()});
