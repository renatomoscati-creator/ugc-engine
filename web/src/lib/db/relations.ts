import { relations } from "drizzle-orm";
import { schedules, posts, accounts } from "./schema";

export const schedulesRelations = relations(schedules, ({ one }) => ({
  post: one(posts, {
    fields: [schedules.postId],
    references: [posts.id],
  }),
  account: one(accounts, {
    fields: [schedules.accountId],
    references: [accounts.id],
  }),
}));

export const postsRelations = relations(posts, ({ many }) => ({
  schedules: many(schedules),
}));
