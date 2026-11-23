-- Binds the CNP read from an acord's ID card to the acord itself (AcordClients.SubjectId)
-- instead of to the client user the acord happens to be attached to. Fixes P0-06: a public
-- acord typed with someone else's phone used to land on that person's client row and every
-- CNP read (by user) then returned the other person's CNP.
--
-- Run BEFORE deploying the API that reads/writes AcordClients.SubjectId. The column is
-- nullable and nothing existing changes, so the running API carries on untouched until the
-- deploy. After the deploy an acord with no SubjectId reveals no CNP (never falls back to
-- the user).
--
-- Backfill is deliberately conservative: only for acords whose user has NO acord from a
-- different broker (or with no broker), and only where the acord's masked CNP
-- (KycSessions.Cnp = ******NNNN, last 4 digits visible, see SubjectService.MaskCnp) matches
-- the user's subject (SubjectMaps.UserId is unique, so there is at most one).
-- Acords on users shared between brokers stay NULL; see Report_P006_SharedUsers.sql.
-- Idempotent.

IF COL_LENGTH('dbo.AcordClients', 'SubjectId') IS NULL
BEGIN
    ALTER TABLE dbo.AcordClients ADD SubjectId NVARCHAR(19) NULL;
    PRINT 'AcordClients.SubjectId added';
END
GO

UPDATE a
SET a.SubjectId = m.SubjectId
FROM dbo.AcordClients a
JOIN dbo.KycSessions k ON k.KycId = a.KycId
JOIN dbo.SubjectMaps m ON m.UserId = a.UserId AND m.CnpLast4 = RIGHT(k.Cnp, 4)
WHERE a.SubjectId IS NULL
  AND k.Cnp IS NOT NULL
  AND LEN(k.Cnp) >= 4
  AND NOT EXISTS (
      SELECT 1 FROM dbo.AcordClients o
      WHERE o.UserId = a.UserId
        AND (o.BrokerProfileId IS NULL OR a.BrokerProfileId IS NULL OR o.BrokerProfileId <> a.BrokerProfileId));
PRINT 'AcordClients.SubjectId backfilled where unambiguous';
GO
