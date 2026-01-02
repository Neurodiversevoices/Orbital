export {
  createRecipient,
  removeRecipient,
  listRecipients,
  createShare,
  revokeShareAccess,
  listActiveShares,
  listAllShares,
  getSharesForRecipient,
  generateShareLink,
  type ShareDuration,
} from './shareService';

export {
  validateShareAccess,
  isShareExpired,
  getShareDaysRemaining,
  type ValidationResult,
} from './accessValidator';

export {
  logShareCreated,
  logShareExpired,
  logShareRevoked,
  logShareAccessed,
  logExportGenerated,
  getRecentAuditEntries,
  clearAuditLog,
} from './auditLogger';
