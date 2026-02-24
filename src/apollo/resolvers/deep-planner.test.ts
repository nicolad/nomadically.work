import { describe, it, expect, vi, beforeEach } from "vitest";
import { deepPlannerResolvers } from "./deep-planner";

vi.mock("ulid", () => ({
  ulid: vi.fn().mockReturnValue("01HXYZ1234567890ABCDEFGHIJ"),
}));

vi.mock("@/lib/admin", () => ({
  isAdminEmail: vi.fn((email: string | null | undefined) => email === "admin@test.com"),
}));

const ADMIN_CONTEXT = {
  userId: "user_123",
  userEmail: "admin@test.com",
  db: null as any,
  loaders: null as any,
};

const NON_ADMIN_CONTEXT = {
  userId: "user_456",
  userEmail: "nobody@test.com",
  db: null as any,
  loaders: null as any,
};

const UNAUTHENTICATED_CONTEXT = {
  userId: null,
  userEmail: null,
  db: null as any,
  loaders: null as any,
};

const FAKE_TASK_ROW = {
  id: "01HXYZ1234567890ABCDEFGHIJ",
  workflow_type: "product_brief",
  problem_description: "Design resume matching v2",
  context: "Use existing Vectorize integration",
  status: "pending",
  current_step: null,
  checkpoint_count: 0,
  output_artifact: null,
  error_message: null,
  started_at: null,
  completed_at: null,
  created_at: "2026-02-23T10:00:00.000Z",
  updated_at: "2026-02-23T10:00:00.000Z",
};

const FAKE_RUNNING_ROW = {
  ...FAKE_TASK_ROW,
  id: "01HXYZ9999999999ABCDEFGHIJ",
  status: "running",
  current_step: "vision",
  checkpoint_count: 5,
  started_at: "2026-02-23T10:01:00.000Z",
};

const FAKE_COMPLETE_ROW = {
  ...FAKE_TASK_ROW,
  id: "01HXYZ8888888888ABCDEFGHIJ",
  status: "complete",
  checkpoint_count: 18,
  output_artifact: "# Product Brief\n\n## Executive Summary\n...",
  started_at: "2026-02-23T08:00:00.000Z",
  completed_at: "2026-02-23T12:00:00.000Z",
};

function makeSelectMock(rows: object[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

function makeSelectWhereMock(rows: object[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

function makeInsertMock(returnRow: object) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([returnRow]),
  };
  return { insert: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("deepPlannerResolvers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Query.deepPlannerTasks", () => {
    it("returns tasks in descending created_at order for admin", async () => {
      const rows = [FAKE_RUNNING_ROW, FAKE_TASK_ROW];
      const dbMock = makeSelectMock(rows);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTasks(
        null,
        {},
        ctx
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("RUNNING");
      expect(result[1].status).toBe("PENDING");
      expect(dbMock.select).toHaveBeenCalled();
    });

    it("rejects non-admin users", async () => {
      const dbMock = makeSelectMock([]);
      const ctx = { ...NON_ADMIN_CONTEXT, db: dbMock as any };

      await expect(
        deepPlannerResolvers.Query.deepPlannerTasks(null, {}, ctx)
      ).rejects.toThrow("Forbidden");
    });

    it("rejects unauthenticated users", async () => {
      const dbMock = makeSelectMock([]);
      const ctx = { ...UNAUTHENTICATED_CONTEXT, db: dbMock as any };

      await expect(
        deepPlannerResolvers.Query.deepPlannerTasks(null, {}, ctx)
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("Query.deepPlannerTask", () => {
    it("returns full task with all fields for admin", async () => {
      const dbMock = makeSelectWhereMock([FAKE_COMPLETE_ROW]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: FAKE_COMPLETE_ROW.id },
        ctx
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(FAKE_COMPLETE_ROW.id);
      expect(result!.status).toBe("COMPLETE");
      expect(result!.checkpointCount).toBe(18);
      expect(result!.outputArtifact).toContain("# Product Brief");
      expect(result!.startedAt).toBe("2026-02-23T08:00:00.000Z");
      expect(result!.completedAt).toBe("2026-02-23T12:00:00.000Z");
    });

    it("returns null for non-existent task", async () => {
      const dbMock = makeSelectWhereMock([]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: "nonexistent" },
        ctx
      );

      expect(result).toBeNull();
    });

    it("rejects non-admin users", async () => {
      const dbMock = makeSelectWhereMock([]);
      const ctx = { ...NON_ADMIN_CONTEXT, db: dbMock as any };

      await expect(
        deepPlannerResolvers.Query.deepPlannerTask(null, { id: "any" }, ctx)
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("Mutation.createDeepPlannerTask", () => {
    it("creates task with pending status and ULID id", async () => {
      const dbMock = makeInsertMock(FAKE_TASK_ROW);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Mutation.createDeepPlannerTask(
        null,
        {
          workflowType: "product_brief",
          problemDescription: "Design resume matching v2",
          context: "Use existing Vectorize integration",
        },
        ctx
      );

      expect(result.id).toBe("01HXYZ1234567890ABCDEFGHIJ");
      expect(result.status).toBe("PENDING");
      expect(result.workflowType).toBe("product_brief");
      expect(result.problemDescription).toBe("Design resume matching v2");
      expect(dbMock.insert).toHaveBeenCalled();
    });

    it("handles null context", async () => {
      const dbMock = makeInsertMock({ ...FAKE_TASK_ROW, context: null });
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Mutation.createDeepPlannerTask(
        null,
        {
          workflowType: "product_brief",
          problemDescription: "Test task",
        },
        ctx
      );

      expect(result.context).toBeNull();
    });

    it("rejects non-admin users", async () => {
      const dbMock = makeInsertMock(FAKE_TASK_ROW);
      const ctx = { ...NON_ADMIN_CONTEXT, db: dbMock as any };

      await expect(
        deepPlannerResolvers.Mutation.createDeepPlannerTask(
          null,
          {
            workflowType: "product_brief",
            problemDescription: "Should fail",
          },
          ctx
        )
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("Mutation.cancelDeepPlannerTask", () => {
    it("cancels a running task", async () => {
      const cancelledRow = {
        ...FAKE_RUNNING_ROW,
        status: "cancelled",
        error_message: "Cancelled by admin",
        completed_at: "2026-02-23T10:05:00.000Z",
        updated_at: "2026-02-23T10:05:00.000Z",
      };
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([FAKE_RUNNING_ROW]),
      };
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([cancelledRow]),
      };
      const dbMock = {
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue(updateChain),
      };
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Mutation.cancelDeepPlannerTask(
        null,
        { id: FAKE_RUNNING_ROW.id },
        ctx
      );

      expect(result.status).toBe("CANCELLED");
      expect(dbMock.update).toHaveBeenCalled();
    });

    it("rejects cancelling non-running tasks", async () => {
      const dbMock = makeSelectWhereMock([FAKE_TASK_ROW]); // pending
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      await expect(
        deepPlannerResolvers.Mutation.cancelDeepPlannerTask(
          null,
          { id: FAKE_TASK_ROW.id },
          ctx
        )
      ).rejects.toThrow("Only running tasks can be cancelled");
    });

    it("rejects non-admin users", async () => {
      const dbMock = makeSelectWhereMock([]);
      const ctx = { ...NON_ADMIN_CONTEXT, db: dbMock as any };

      await expect(
        deepPlannerResolvers.Mutation.cancelDeepPlannerTask(
          null,
          { id: "any" },
          ctx
        )
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("progress fields", () => {
    it("calculates progressPercent for running task", async () => {
      const row = { ...FAKE_RUNNING_ROW, checkpoint_count: 51 }; // 51/102 = 50%
      const dbMock = makeSelectWhereMock([row]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: row.id },
        ctx
      );

      expect(result!.totalSteps).toBe(102);
      expect(result!.progressPercent).toBe(50);
    });

    it("returns 100% for complete tasks", async () => {
      const dbMock = makeSelectWhereMock([FAKE_COMPLETE_ROW]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: FAKE_COMPLETE_ROW.id },
        ctx
      );

      expect(result!.progressPercent).toBe(100);
    });

    it("returns 0% for pending tasks", async () => {
      const dbMock = makeSelectWhereMock([FAKE_TASK_ROW]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: FAKE_TASK_ROW.id },
        ctx
      );

      expect(result!.progressPercent).toBe(0);
    });

    it("caps at 99% for in-progress tasks", async () => {
      const row = { ...FAKE_RUNNING_ROW, checkpoint_count: 101 }; // almost done but not complete
      const dbMock = makeSelectWhereMock([row]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: row.id },
        ctx
      );

      expect(result!.progressPercent).toBe(99);
    });
  });

  describe("status enum mapping", () => {
    it.each([
      ["pending", "PENDING"],
      ["running", "RUNNING"],
      ["complete", "COMPLETE"],
      ["failed", "FAILED"],
      ["cancelled", "CANCELLED"],
    ])("maps DB status '%s' to GraphQL '%s'", async (dbStatus, gqlStatus) => {
      const row = { ...FAKE_TASK_ROW, status: dbStatus };
      const dbMock = makeSelectWhereMock([row]);
      const ctx = { ...ADMIN_CONTEXT, db: dbMock as any };

      const result = await deepPlannerResolvers.Query.deepPlannerTask(
        null,
        { id: row.id },
        ctx
      );

      expect(result!.status).toBe(gqlStatus);
    });
  });
});
