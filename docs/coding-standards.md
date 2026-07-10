# Coding Standards

## Architecture

New feature code should go into `src/modules`.

Shared reusable code should go into `src/shared`.

Generic UI components should go into `src/shared/ui`.

Legacy code in `src/components`, `src/repositories`, and `src/services` can remain until migrated.

## Naming

React components: PascalCase  
Files for components: PascalCase.tsx  
Services: camelCase  
Database tables: snake_case  
API routes: kebab-case  
Environment variables: UPPER_SNAKE_CASE

## UI

Use shared UI components where possible.

Avoid browser `alert()`.

Use toast notifications for user feedback.

Avoid duplicated Tailwind blocks when a shared component exists.