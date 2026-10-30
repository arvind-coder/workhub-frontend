import { z } from "zod";

/** Limits below mirror the backend OpenAPI request schemas. */

export const objectIdPattern = /^[a-fA-F0-9]{24}$/;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(254, "Email must be 254 characters or fewer")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be 72 characters or fewer"),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(150, "Name must be 150 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be 2000 characters or fewer"),
  status: z.enum(["active", "archived"]),
});
export type ProjectValues = z.infer<typeof projectSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title must be 150 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be 2000 characters or fewer"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  /** "" means unassigned. */
  assignedTo: z.string().refine((v) => v === "" || objectIdPattern.test(v), "Select a valid assignee"),
  /** yyyy-MM-dd from <input type="date">, or "" for none. */
  dueDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date"),
});
export type TaskValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a comment before posting")
    .max(2000, "Comments must be 2000 characters or fewer"),
});
export type CommentValues = z.infer<typeof commentSchema>;

export const addMemberSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(objectIdPattern, "A user ID is 24 hexadecimal characters"),
  role: z.enum(["MEMBER", "PROJECT_MANAGER"]),
});
export type AddMemberValues = z.infer<typeof addMemberSchema>;
