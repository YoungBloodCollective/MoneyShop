-- =============================================
-- Migration: rename AcordClients.TipAct values
-- The identity-card options were renamed to match how the operator refers to
-- them. Run in this order: the old 'carte_identitate' must move out of the way
-- before 'buletin' takes that name.
-- =============================================

IF OBJECT_ID('dbo.AcordClients', 'U') IS NOT NULL
BEGIN
    UPDATE dbo.AcordClients SET TipAct = 'carte_identitate_simpla'      WHERE TipAct = 'carte_identitate';
    PRINT '  carte_identitate      -> carte_identitate_simpla: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

    UPDATE dbo.AcordClients SET TipAct = 'carte_identitate_electronica' WHERE TipAct = 'buletin_electronic';
    PRINT '  buletin_electronic    -> carte_identitate_electronica: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

    UPDATE dbo.AcordClients SET TipAct = 'carte_identitate'             WHERE TipAct = 'buletin';
    PRINT '  buletin               -> carte_identitate: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
END
GO
