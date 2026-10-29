-- Timelines and security audit entries are append-only, including direct SQL updates.
CREATE FUNCTION campusfix_immutable_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CampusFix audit history is immutable';
END;
$$;
CREATE TRIGGER status_event_immutable BEFORE UPDATE OR DELETE ON "StatusEvent"
FOR EACH ROW EXECUTE FUNCTION campusfix_immutable_event();
CREATE TRIGGER audit_event_immutable BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION campusfix_immutable_event();
ALTER TABLE "LinkRequest" ADD CONSTRAINT "LinkRequest_source_fkey"
FOREIGN KEY ("sourceSessionId") REFERENCES "Session"("id") ON DELETE RESTRICT;
ALTER TABLE "LinkRequest" ADD CONSTRAINT "LinkRequest_target_fkey"
FOREIGN KEY ("targetSessionId") REFERENCES "Session"("id") ON DELETE RESTRICT;
CREATE INDEX "LinkRequest_source_state" ON "LinkRequest"("sourceSessionId","state");
CREATE INDEX "Session_profile_expiry" ON "Session"("profileId","expiresAt");
