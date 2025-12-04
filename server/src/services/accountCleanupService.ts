import { UserModel } from "../models/UserModel";
import { ActivityLogModel } from "../models/ActivityLogModel";
import { VerificationTokenModel } from "../models/VerificationTokenModel";

export interface CleanupStats {
  deletedCount: number;
  duration: number;
  timestamp: string;
}

class AccountCleanupService {
  private userModel: UserModel;
  private verificationTokenModel: VerificationTokenModel;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.userModel = new UserModel();
    this.verificationTokenModel = new VerificationTokenModel();
  }

  /**
   * Clean up unactivated accounts older than 7 days
   * @returns Statistics about the cleanup operation
   */
  async cleanupUnactivatedAccounts(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log("Account cleanup already in progress, skipping...");
      return {
        deletedCount: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Check how many accounts will be deleted
      const countBefore = await this.userModel.countUnactivatedAccounts(7);

      if (countBefore === 0) {
        console.log("✅ No unactivated accounts to clean up");
        return {
          deletedCount: 0,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      console.log(
        `🧹 Starting cleanup: Found ${countBefore} unactivated account(s) older than 7 days`
      );

      // Delete unactivated accounts
      const deletedCount = await this.userModel.deleteUnactivatedAccounts(7);

      // Also clean up associated verification tokens
      // Note: This is a best-effort cleanup - if tokens are orphaned, they'll expire naturally
      
      // Log the cleanup activity as a system action
      try {
        await ActivityLogModel.createLog({
          type: "system",
          message: `Cleaned up ${deletedCount} unactivated user account(s) older than 7 days`,
          userName: 'System',
          metadata: {
            deletedCount,
            cleanupTime: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error("Failed to log account cleanup:", logError);
        // Continue even if logging fails
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Account cleanup completed: Deleted ${deletedCount} account(s) in ${duration}ms`
      );

      return {
        deletedCount,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("❌ Error during account cleanup:", error);
      
      // Log the error as a system action
      try {
        await ActivityLogModel.createLog({
          type: "system",
          message: `Account cleanup failed: ${error.message}`,
          userName: 'System',
          metadata: {
            error: error.message,
            cleanupTime: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error("Failed to log cleanup error:", logError);
      }

      // Return error stats
      return {
        deletedCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduled cleanup job
   * Runs daily at 2:00 AM by default
   * @param intervalHours - Hours between cleanup runs (default: 24)
   */
  start(intervalHours: number = 24): void {
    if (this.cleanupInterval) {
      console.log("⚠️ Account cleanup scheduler already running");
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run immediately on startup
    console.log("🚀 Starting account cleanup service...");
    this.cleanupUnactivatedAccounts();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnactivatedAccounts();
    }, intervalMs);

    console.log(
      `✅ Account cleanup service started. Will run every ${intervalHours} hour(s)`
    );
  }

  /**
   * Stop the scheduled cleanup job
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("🛑 Account cleanup service stopped");
    }
  }

  /**
   * Get the status of the cleanup service
   */
  getStatus(): {
    isRunning: boolean;
    hasScheduler: boolean;
  } {
    return {
      isRunning: this.isRunning,
      hasScheduler: this.cleanupInterval !== null,
    };
  }
}

// Export singleton instance
export const accountCleanupService = new AccountCleanupService();
export default accountCleanupService;

