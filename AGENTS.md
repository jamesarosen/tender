# Documentation

- Plans, architecture designs, and other larger-scale documentation goes in `docs/`
- Use Mermaid for diagrams when possible
- Write JSDoc comments for exported values. Use a single short sentence unless the value being documented is particularly complex.
- Avoid inline comments that simply reiterate what the code does.

# Data

This section is CRITICAL when working in [@tender/db](./packages/db).

- Use CHECK constraints for JSON and timestamps
- Enforce foreign-key constraints
- Prefer soft-delete to disallow hard delete with cascade
- Define Kysely types using raw database types
- Define Zod schemas for application-land types
