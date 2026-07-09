# ADR-0001

## Decision

RPOS will use a modular architecture instead of organizing by technical layers.

## Reason

Modules scale better than repositories/services folders as the application grows.

## Consequences

Each module owns its business logic.

Shared code stays generic.