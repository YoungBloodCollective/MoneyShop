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
-- Backfill is deliberately conservative: only where the acord's masked CNP (KycSessions.Cnp
-- = ******NNNN, last 4 digits visible, see SubjectService.MaskCnp) matches exactly ONE
-- subject of the acord's own user. Anything ambiguous or unmatched stays NULL.
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
JOIN (
    SELECT s.UserId, s.CnpLast4, MIN(s.SubjectId) AS SubjectId
    FROM dbo.SubjectMaps s
    WHERE s.CnpLast4 IS NOT NULL
    GROUP BY s.UserId, s.CnpLast4
    HAVING COUNT(*) = 1
) m ON m.UserId = a.UserId AND m.CnpLast4 = RIGHT(k.Cnp, 4)
WHERE a.SubjectId IS NULL
  AND k.Cnp IS NOT NULL
  AND LEN(k.Cnp) >= 4;
PRINT 'AcordClients.SubjectId backfilled where unambiguous';
GO
