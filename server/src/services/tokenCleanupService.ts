import { VerificationTokenModel } from '../models/VerificationTokenModel';
import { StaffInvitationModel } from '../models/StaffInvitationModel';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { logger } from '../utils/logger';

export interface TokenCleanupStats {
  deletedTokens: number;
  deletedInvitations: number;
  duration: number;
  timestamp: string;
}

class TokenCleanupService {
  private verificationTokenModel: VerificationTokenModel;
  private staffInvitationModel: StaffInvitationModel;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.verificationTokenModel = new VerificationTokenModel();
    this.staffInvitationModel = new StaffInvitationModel();
  }

  /**
   * Clean up expired verification tokens and staff invitations
   * @returns Statistics about the cleanup operation
   */
  async cleanupExpiredTokens(): Promise<TokenCleanupStats> {
    if (this.isRunning) {
      console.log('Token cleanup already in progress, skipping...');
      return {
        deletedTokens: 0,
        deletedInvitations: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🧹 Starting token cleanup...');

      // Clean up expired verification tokens
      try {
        await this.verificationTokenModel.deleteExpiredTokens();
        // Note: deleteExpiredTokens doesn't return count, so we can't track it precisely
        console.log('✅ Expired verification tokens cleaned up');
      } catch (error: any) {
        logger.error('Failed to clean up expired verification tokens:', error);
      }

      // Clean up expired staff invitations
      try {
        await this.staffInvitationModel.deleteExpiredInvitations();
        // Note: deleteExpiredInvitations doesn't return count either
        console.log('✅ Expired staff invitations cleaned up');
      } catch (error: any) {
        logger.error('Failed to clean up expired staff invitations:', error);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Token cleanup completed in ${duration}ms`);

      // Log the cleanup activity as a system action
      try {
        await ActivityLogModel.createLog({
          type: 'system',
          message: 'Expired verification tokens and staff invitations cleaned up',
          userName: 'System',
          metadata: {
            cleanupTime: new Date().toISOString(),
          },
        });
      } catch (logError) {
        logger.warn('Failed to log token cleanup:', logError);
      }

      return {
        deletedTokens: 0, // Cannot get exact count without modifying models
        deletedInvitations: 0, // Cannot get exact count without modifying models
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('❌ Error during token cleanup:', error);

      return {
        deletedTokens: 0,
        deletedInvitations: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduled cleanup job
   * Runs daily by default
   * @param intervalHours - Hours between cleanup runs (default: 24)
   */
  start(intervalHours: number = 24): void {
    if (this.cleanupInterval) {
      console.log('⚠️ Token cleanup scheduler already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run immediately on startup
    console.log('🚀 Starting token cleanup service...');
    this.cleanupExpiredTokens();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, intervalMs);

    console.log(
      `✅ Token cleanup service started. Will run every ${intervalHours} hour(s)`
    );
  }

  /**
   * Stop the scheduled cleanup job
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Token cleanup service stopped');
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
export const tokenCleanupService = new TokenCleanupService();
export default tokenCleanupService;

