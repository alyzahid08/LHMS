# Project TODO

- [x] Define a secure relational PostgreSQL-ready data model for users, residents, rooms, beds, payments, complaints, visitors, visitor requests, notices, and activity records.
- [x] Implement role-aware authentication, protected procedures, administrator authorization, resident data isolation, and logout.
- [x] Implement resident management with profiles, validation, search/filtering, room and bed assignment, status changes, and safe deactivation.
- [x] Implement room and bed management with occupancy calculations and duplicate-assignment protection.
- [x] Implement immutable monthly payment records, balance/status calculations, filtering, payment history, and printable receipt details.
- [x] Implement complaint records with category validation and Pending, In Progress, and Resolved transitions.
- [x] Implement visitor requests, administrator approval decisions, and visitor entry/exit record management.
- [x] Implement notice drafting, editing, deletion, publication, and role-appropriate viewing.
- [x] Build an elegant responsive Levelose dashboard with persistent navigation, role-aware pages, charts, tables, pagination, forms, confirmation dialogs, and notifications.
- [x] Add localhost setup instructions, first-admin setup, migration guidance, and PostgreSQL backup and restoration instructions.
- [x] Add automated tests for critical authorization, validation, payment-history, and bed-assignment rules.
- [x] Verify the final interface and complete all checklist items before delivery.
- [x] Add a responsive occupancy chart to the administrator dashboard.
- [x] Expand automated tests for administrator protection, resident data isolation, and append-only payment policy.
- [x] Document the managed preview database limitation and local PostgreSQL verification requirement.
- [x] Add direct resident-profile ownership validation and test evidence.
- [x] Verify the exposed payment API contains no update or delete operation.
- [x] Add direct resident-profile ownership validation and test evidence.
- [x] Verify the exposed payment API contains no update or delete operation.
- [x] Fix the local login flow so the initial administrator account can be created and verified from the sign-in screen.
- [x] Fix the local login flow so the initial administrator account can be created and verified from the sign-in screen.
- [x] Add a clearly labelled database-free demonstration mode with administrator and resident views.
- [x] Make the demonstration dashboard, operational modules, and key actions interactive using local-only sample records.
- [x] Verify the responsive demonstration flow and provide immediate demo access instructions.
- [x] Add a clearly labelled database-free demonstration mode with administrator and resident views.
- [x] Make the demonstration dashboard, operational modules, and key actions interactive using local-only sample records.
- [x] Verify the responsive demonstration flow and provide immediate demo access instructions.
- [x] Prepare Levelose for shared browser access through managed HTTPS hosting instead of localhost.
- [x] Document the distinction between demo-only publishing and real-data publishing with a hosted PostgreSQL database.
- [x] Verify desktop, tablet, and phone access for the shared-access build.

- [x] Verify shared access at tablet width after the unauthenticated entry updates.
- [x] Capture post-change visual verification for the published-style entry and login routes.

- [ ] Audit current demo and local-data boundaries for a production release.
- [ ] Add professional production launch safeguards, including demo separation, configuration validation, and operational empty/error states.
- [ ] Prepare hosted persistence and release documentation for real hostel records.
- [ ] Verify production build, responsive launch flows, and save a release checkpoint.

- [ ] Configure Neon as the hosted PostgreSQL provider for Levelose production data.
- [ ] Add and validate server-side Neon connection and encryption-key configuration.
- [ ] Run the Levelose PostgreSQL migration against Neon and create the first production administrator.
- [ ] Verify the production release workflows and prepare the final publish checkpoint.

