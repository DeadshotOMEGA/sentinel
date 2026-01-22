import { initServer } from "@ts-rest/express";
import { ddsContract } from "@sentinel/contracts";
import type {
  DdsAuditLogQuery,
  AssignDdsInput,
  TransferDdsInput,
  ReleaseDdsInput,
  IdParam,
} from "@sentinel/contracts";
import { DdsService } from "../services/dds-service.js";
import { getPrismaClient } from "../lib/database.js";

const s = initServer();

const ddsService = new DdsService(getPrismaClient());

interface DdsAssignmentData {
  id: string;
  memberId: string;
  assignedDate: Date | string;
  acceptedAt: Date | string | null;
  releasedAt: Date | string | null;
  transferredTo: string | null;
  assignedBy: string | null;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  member: { id: string; name: string; rank: string; division: string | null };
  assignedByAdminName: string | null;
}

/**
 * Helper to transform DDS assignment to API format
 */
function toApiFormat(assignment: DdsAssignmentData) {
  return {
    id: String(assignment.id),
    memberId: String(assignment.memberId),
    assignedDate:
      assignment.assignedDate instanceof Date
        ? assignment.assignedDate.toISOString()
        : String(assignment.assignedDate),
    acceptedAt:
      assignment.acceptedAt instanceof Date
        ? assignment.acceptedAt.toISOString()
        : assignment.acceptedAt
          ? String(assignment.acceptedAt)
          : null,
    releasedAt:
      assignment.releasedAt instanceof Date
        ? assignment.releasedAt.toISOString()
        : assignment.releasedAt
          ? String(assignment.releasedAt)
          : null,
    transferredTo: assignment.transferredTo
      ? String(assignment.transferredTo)
      : null,
    assignedBy: assignment.assignedBy ? String(assignment.assignedBy) : null,
    status: String(assignment.status) as
      | "pending"
      | "active"
      | "transferred"
      | "released",
    notes: assignment.notes ? String(assignment.notes) : null,
    createdAt:
      assignment.createdAt instanceof Date
        ? assignment.createdAt.toISOString()
        : String(assignment.createdAt),
    updatedAt:
      assignment.updatedAt instanceof Date
        ? assignment.updatedAt.toISOString()
        : String(assignment.updatedAt),
    member: assignment.member,
    assignedByAdminName: assignment.assignedByAdminName
      ? String(assignment.assignedByAdminName)
      : null,
  };
}

/**
 * DDS route implementation using ts-rest
 */
export const ddsRouter = s.router(ddsContract, {
  /**
   * Get today's DDS assignment
   */
  getCurrentDds: async () => {
    try {
      const assignment = await ddsService.getCurrentDds();

      if (!assignment) {
        return {
          status: 200 as const,
          body: {
            assignment: null,
          },
        };
      }

      return {
        status: 200 as const,
        body: {
          assignment: toApiFormat(assignment),
        },
      };
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch current DDS",
        },
      };
    }
  },

  /**
   * Check if DDS exists for today
   */
  checkDdsExists: async () => {
    try {
      const exists = await ddsService.hasDdsForToday();

      return {
        status: 200 as const,
        body: {
          exists,
        },
      };
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to check DDS exists",
        },
      };
    }
  },

  /**
   * Get DDS audit log
   */
  getAuditLog: async ({ query }: { query: DdsAuditLogQuery }) => {
    try {
      const limit = query.limit || 50;
      const logs = await ddsService.getAuditLog(query.memberId, limit);

      return {
        status: 200 as const,
        body: {
          logs: logs.map((log) => ({
            id: log.id,
            memberId: log.memberId,
            tagName: log.tagName,
            action: log.action,
            fromMemberId: log.fromMemberId,
            toMemberId: log.toMemberId,
            performedBy: log.performedBy,
            performedByType: log.performedByType,
            timestamp: log.timestamp.toISOString(),
            notes: log.notes,
          })),
          count: logs.length,
        },
      };
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch audit log",
        },
      };
    }
  },

  /**
   * Member self-accepts DDS at kiosk
   */
  acceptDds: async ({ params }: { params: IdParam }) => {
    try {
      const assignment = await ddsService.acceptDds(params.id);

      return {
        status: 200 as const,
        body: {
          success: true,
          message: "DDS accepted successfully",
          assignment: toApiFormat(assignment),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return {
          status: 404 as const,
          body: {
            error: "NOT_FOUND",
            message: error.message,
          },
        };
      }

      if (
        error instanceof Error &&
        error.message.includes("already been assigned")
      ) {
        return {
          status: 409 as const,
          body: {
            error: "CONFLICT",
            message: error.message,
          },
        };
      }

      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to accept DDS",
        },
      };
    }
  },

  /**
   * Admin assigns DDS to a member
   */
  assignDds: async ({ body }: { body: AssignDdsInput }) => {
    try {
      // Get admin ID from request context (would be from auth middleware)
      // For now, using placeholder until auth is implemented
      const adminId = "system";

      const assignment = await ddsService.assignDds(
        body.memberId,
        adminId,
        body.notes,
      );

      return {
        status: 200 as const,
        body: {
          success: true,
          message: "DDS assigned successfully",
          assignment: toApiFormat(assignment),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return {
          status: 404 as const,
          body: {
            error: "NOT_FOUND",
            message: error.message,
          },
        };
      }

      if (
        error instanceof Error &&
        error.message.includes("already been assigned")
      ) {
        return {
          status: 409 as const,
          body: {
            error: "CONFLICT",
            message: error.message,
          },
        };
      }

      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to assign DDS",
        },
      };
    }
  },

  /**
   * Transfer DDS to another member
   */
  transferDds: async ({ body }: { body: TransferDdsInput }) => {
    try {
      // Get admin ID from request context (would be from auth middleware)
      // For now, using placeholder until auth is implemented
      const adminId = "system";

      const assignment = await ddsService.transferDds(
        body.toMemberId,
        adminId,
        body.notes,
      );

      return {
        status: 200 as const,
        body: {
          success: true,
          message: "DDS transferred successfully",
          assignment: toApiFormat(assignment),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return {
          status: 404 as const,
          body: {
            error: "NOT_FOUND",
            message: error.message,
          },
        };
      }

      if (error instanceof Error && error.message.includes("Cannot transfer")) {
        return {
          status: 400 as const,
          body: {
            error: "VALIDATION_ERROR",
            message: error.message,
          },
        };
      }

      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to transfer DDS",
        },
      };
    }
  },

  /**
   * Release DDS role
   */
  releaseDds: async ({ body }: { body: ReleaseDdsInput }) => {
    try {
      // Get admin ID from request context (would be from auth middleware)
      // For now, using placeholder until auth is implemented
      const adminId = "system";

      await ddsService.releaseDds(adminId, body.notes);

      return {
        status: 200 as const,
        body: {
          assignment: null,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return {
          status: 404 as const,
          body: {
            error: "NOT_FOUND",
            message: error.message,
          },
        };
      }

      return {
        status: 500 as const,
        body: {
          error: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to release DDS",
        },
      };
    }
  },
});
