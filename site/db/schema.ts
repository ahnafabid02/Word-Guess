import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
 code: text('code').primaryKey(),
 body: text('body').notNull(),
 revision: integer('revision').notNull().default(0),
 updated: integer('updated').notNull(),
});
