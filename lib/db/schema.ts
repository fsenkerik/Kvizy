import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AnswerMap, Question, QuestionResult } from "@/lib/quiz/types";
import { newId } from "@/lib/ids";

const id = () => text("id").primaryKey().$defaultFn(newId);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const teachers = pgTable("teachers", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: createdAt(),
});

/** Skupina tříd, např. „1. ročník + kvinta“. Témata a kvízy patří skupině. */
export const groups = pgTable(
  "groups",
  {
    id: id(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    level: text("level", { enum: ["nizsi", "vyssi"] }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("groups_teacher_idx").on(t.teacherId)],
);

export const classes = pgTable(
  "classes",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("classes_group_idx").on(t.groupId)],
);

export const students = pgTable(
  "students",
  {
    id: id(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    pin: text("pin").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    pinFailedAttempts: integer("pin_failed_attempts").notNull().default(0),
    pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("students_class_idx").on(t.classId)],
);

export const topics = pgTable(
  "topics",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    weekNumber: integer("week_number"),
    description: text("description"),
    isVisible: boolean("is_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("topics_group_idx").on(t.groupId)],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: id(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    questions: jsonb("questions").$type<Question[]>().notNull(),
    /** null = neomezeně */
    maxAttempts: integer("max_attempts"),
    showAnswersAfter: boolean("show_answers_after").notNull().default(true),
    isOpen: boolean("is_open").notNull().default(true),
    /** Body při 100 % (bodování pro studenty). */
    points: integer("points").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("quizzes_topic_idx").on(t.topicId)],
);

/** Odkaz na cvičení / úkol mimo aplikaci, zobrazuje se pod tématem odděleně od kvízů. */
export const links = pgTable(
  "links",
  {
    id: id(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    /** Body za splnění (otevření odkazu a setrvání). 0 = bez bodů. */
    points: integer("points").notNull().default(5),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("links_topic_idx").on(t.topicId)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: id(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    answers: jsonb("answers").$type<AnswerMap>().notNull(),
    results: jsonb("results").$type<QuestionResult[]>().notNull(),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    percent: integer("percent").notNull(),
  },
  (t) => [
    index("attempts_quiz_idx").on(t.quizId),
    index("attempts_student_idx").on(t.studentId),
    uniqueIndex("attempts_quiz_student_number_idx").on(t.quizId, t.studentId, t.attemptNumber),
  ],
);

/** Návštěva odkazu studentem: kliknutí a (po uplynutí čekací doby) splnění. */
export const linkVisits = pgTable(
  "link_visits",
  {
    id: id(),
    linkId: text("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("link_visits_link_student_idx").on(t.linkId, t.studentId)],
);

/**
 * Bodová kniha studenta – jeden záznam na zdroj (kvíz / odkaz). Přežije skrytí i smazání zdroje
 * (FK se nastaví na null, sourceKey a label zůstanou), takže celkové body studenta nemizí.
 */
export const pointEvents = pgTable(
  "point_events",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    /** "quiz:<id>" nebo "link:<id>" */
    sourceKey: text("source_key").notNull(),
    quizId: text("quiz_id").references(() => quizzes.id, { onDelete: "set null" }),
    linkId: text("link_id").references(() => links.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    points: integer("points").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("point_events_student_source_idx").on(t.studentId, t.sourceKey), index("point_events_student_idx").on(t.studentId)],
);

export const teachersRelations = relations(teachers, ({ many }) => ({ groups: many(groups) }));
export const groupsRelations = relations(groups, ({ one, many }) => ({
  teacher: one(teachers, { fields: [groups.teacherId], references: [teachers.id] }),
  classes: many(classes),
  topics: many(topics),
}));
export const classesRelations = relations(classes, ({ one, many }) => ({
  group: one(groups, { fields: [classes.groupId], references: [groups.id] }),
  students: many(students),
}));
export const studentsRelations = relations(students, ({ one, many }) => ({
  class: one(classes, { fields: [students.classId], references: [classes.id] }),
  attempts: many(attempts),
}));
export const topicsRelations = relations(topics, ({ one, many }) => ({
  group: one(groups, { fields: [topics.groupId], references: [groups.id] }),
  quizzes: many(quizzes),
  links: many(links),
}));
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  topic: one(topics, { fields: [quizzes.topicId], references: [topics.id] }),
  attempts: many(attempts),
}));
export const linksRelations = relations(links, ({ one }) => ({
  topic: one(topics, { fields: [links.topicId], references: [topics.id] }),
}));
export const attemptsRelations = relations(attempts, ({ one }) => ({
  quiz: one(quizzes, { fields: [attempts.quizId], references: [quizzes.id] }),
  student: one(students, { fields: [attempts.studentId], references: [students.id] }),
}));

export type Teacher = typeof teachers.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Link = typeof links.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type LinkVisit = typeof linkVisits.$inferSelect;
export type PointEvent = typeof pointEvents.$inferSelect;
