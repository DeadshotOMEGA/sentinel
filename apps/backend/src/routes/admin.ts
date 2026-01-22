import { Router, Request, Response } from "express";
import { z } from "zod";
import { auth } from "../lib/auth.js";
import { requireRole, Role } from "../middleware/roles.js";
import { authLogger } from "../lib/logger.js";

const router = Router();

/**
 * Create User Schema
 */
const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  name: z.string().optional(),
  role: z.enum([
    Role.DEVELOPER,
    Role.ADMIN,
    Role.EXECUTIVE,
    Role.DUTY_WATCH,
    Role.QUARTERMASTER,
  ]),
  badgeId: z.string().optional(),
});

/**
 * Update User Schema
 */
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z
    .enum([
      Role.DEVELOPER,
      Role.ADMIN,
      Role.EXECUTIVE,
      Role.DUTY_WATCH,
      Role.QUARTERMASTER,
    ])
    .optional(),
  badgeId: z.string().nullable().optional(),
});

/**
 * GET /api/admin/users
 *
 * List all users with pagination
 * Requires: Admin or Developer role
 */
router.get(
  "/users",
  requireRole([Role.ADMIN, Role.DEVELOPER]),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Use better-auth admin plugin to list users
      const users = await auth.api.listUsers({
        headers: req.headers as Record<string, string>,
        query: {
          limit: limit.toString(),
          offset: offset.toString(),
        },
      });

      const userCount = users.users?.length || 0;
      authLogger.info("Listed users", {
        count: userCount,
        limit,
        offset,
        requestedBy: req.user?.id,
      });

      return res.status(200).json({
        users: users.users || [],
        pagination: {
          limit,
          offset,
          total:
            ("total" in users ? (users as { total?: number }).total : null) ||
            userCount,
        },
      });
    } catch (error) {
      authLogger.error("List users error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to list users",
      });
    }
  },
);

/**
 * POST /api/admin/users
 *
 * Create a new user
 * Requires: Admin or Developer role
 */
router.post(
  "/users",
  requireRole([Role.ADMIN, Role.DEVELOPER]),
  async (req: Request, res: Response) => {
    try {
      const result = createUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Validation Error",
          message: result.error.issues[0]?.message || "Validation failed",
        });
      }

      // Use better-auth admin plugin to create user
      const createUserBody: Record<string, unknown> = {
        email: result.data.email,
        password: result.data.password,
        name: result.data.name || result.data.email.split("@")[0],
      };

      const user = await auth.api.createUser({
        body: createUserBody,
        headers: req.headers as Record<string, string>,
      });

      const userData = user.data || user;
      const userIdValue =
        (userData as Record<string, unknown>)?.user?.id ||
        (userData as Record<string, unknown>)?.id;
      const emailValue =
        (userData as Record<string, unknown>)?.user?.email ||
        (userData as Record<string, unknown>)?.email;

      authLogger.info("User created", {
        userId: String(userIdValue),
        email: String(emailValue),
        role: result.data.role,
        createdBy: req.user?.id,
      });

      return res.status(201).json({ user });
    } catch (error) {
      authLogger.error("Create user error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create user",
      });
    }
  },
);

/**
 * PATCH /api/admin/users/:id
 *
 * Update user details
 * Requires: Admin, Developer, or Duty Watch (Duty Watch can only update, not create/delete)
 */
router.patch(
  "/users/:id",
  requireRole([Role.ADMIN, Role.DEVELOPER, Role.DUTY_WATCH]),
  async (req: Request, res: Response) => {
    try {
      const result = updateUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Validation Error",
          message: result.error.issues[0]?.message || "Validation failed",
        });
      }

      const userId = req.params.id;

      // Use better-auth admin plugin to update user
      const user = await auth.api.updateUser({
        params: { userId },
        body: result.data,
        headers: req.headers as Record<string, string>,
      });

      authLogger.info("User updated", {
        userId,
        updates: Object.keys(result.data),
        updatedBy: req.user?.id,
      });

      return res.status(200).json({ user });
    } catch (error) {
      authLogger.error("Update user error", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: req.params.id,
      });

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update user",
      });
    }
  },
);

/**
 * DELETE /api/admin/users/:id
 *
 * Delete a user
 * Requires: Admin or Developer role
 */
router.delete(
  "/users/:id",
  requireRole([Role.ADMIN, Role.DEVELOPER]),
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      // Use better-auth admin plugin to delete user
      await auth.api.deleteUser({
        body: { callbackURL: "", token: "" },
        headers: req.headers as Record<string, string>,
      });

      authLogger.info("User deleted", {
        userId,
        deletedBy: req.user?.id,
      });

      return res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error) {
      authLogger.error("Delete user error", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: req.params.id,
      });

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete user",
      });
    }
  },
);

/**
 * GET /api/admin/sessions
 *
 * List active sessions
 * Requires: Admin or Developer role
 */
router.get(
  "/sessions",
  requireRole([Role.ADMIN, Role.DEVELOPER]),
  async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;

      // Use better-auth admin plugin to list sessions
      const sessions = await auth.api.listSessions({
        query: userId ? { userId } : {},
        headers: req.headers as Record<string, string>,
      });

      authLogger.info("Listed sessions", {
        count: sessions.length,
        userId,
        requestedBy: req.user?.id,
      });

      return res.status(200).json({ sessions });
    } catch (error) {
      authLogger.error("List sessions error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to list sessions",
      });
    }
  },
);

/**
 * DELETE /api/admin/sessions/:id
 *
 * Revoke a specific session
 * Requires: Admin or Developer role
 */
router.delete(
  "/sessions/:id",
  requireRole([Role.ADMIN, Role.DEVELOPER]),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id;

      // Use better-auth admin plugin to revoke session
      await auth.api.revokeSession({
        body: { token: sessionId },
        headers: req.headers as Record<string, string>,
      });

      authLogger.info("Session revoked", {
        sessionId,
        revokedBy: req.user?.id,
      });

      return res.status(200).json({
        message: "Session revoked successfully",
      });
    } catch (error) {
      authLogger.error("Revoke session error", {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId: req.params.id,
      });

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to revoke session",
      });
    }
  },
);

// Note: API Key management routes will be added after verifying the API Key plugin's API

export default router;
