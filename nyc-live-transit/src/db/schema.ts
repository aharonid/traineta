import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const stations = sqliteTable('stations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  lines: text('lines'), // JSON array of line IDs
});

export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;
