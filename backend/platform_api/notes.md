# NeuroVision Architecture Notes

This document tracks architectural decisions, pivots, and lessons learned during the development of the NeuroVision platform.

## 1. Multi-Tenant Relationship Pivot
- **Initial Design**: Used a simple `ForeignKey` from `User` to `Organisation`.
- **The "Mistake"**: A direct `ForeignKey` restricts a user to exactly one organization. In the clinical/research world, doctors and consultants often work across multiple hospitals or laboratories with a single professional identity.
- **The Fix**: Transitioned to a **Membership Pattern** (`TenantMembership`).
- **Lesson**: One identity (Public Schema) can have many memberships (Isolated Tenants). This follows the Slack/GitHub workspace model.

## 2. Model Grouping Alignment
- **Initial Design**: `Organisation` and `Domain` in a standalone `tenant` app.
- **The Pivot**: Moved these models into the `users` app to align with established patterns (while maintaining NeuroVision-specific fields) and to simplify the authentication/permission boundary.
- **Reasoning**: Access control and Identity are two sides of the same coin. Centralizing them reduces import loops and configuration complexity.

## 3. ID Strategies (ULID vs UUID)
- **Status**: Currently using `UUID` as per standard Django, but keeping `ULID` in mind for future indexing performance.
- **Note**: Changing Primary Key types after migrations is a "Breaking Change" that requires a database reset.

## 4. Difference from CRM
- While the "Membership" pattern is used in CRMs (like the reference office repo), NeuroVision differs in its **Isolated Clinical Data**. 
- In a CRM, data is often "soft-deleted" or filtered. In NeuroVision, the **Schema-per-Tenant** enforcement is literal—data literally cannot leak between schemas at the database level.
