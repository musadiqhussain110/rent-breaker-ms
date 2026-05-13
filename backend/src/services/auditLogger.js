const AuditEvent = require("../models/AuditEvent");

async function logAuditEvent({
  actorUser,
  actorRole,
  eventType,
  entityType,
  entityId,
  metadata
}) {
  if (!eventType || !entityType || !entityId) return;

  try {
    await AuditEvent.create({
      actorUser: actorUser || undefined,
      actorRole: actorRole || undefined,
      eventType,
      entityType,
      entityId,
      metadata: metadata || undefined
    });
  } catch (err) {
    // non-blocking logger
    console.error("audit_event_failed", err.message);
  }
}

module.exports = { logAuditEvent };
