/**
 * This file does nothing - `declare global { namespace PrismaJson {} }` and
 * `export {}` have no runtime or type effect. Its previous docstring claimed
 * a middleware "automatically converts" camelCase<->snake_case at runtime;
 * that middleware (prisma-transform.middleware.ts) exists but is never
 * activated (`prisma.$use()` is never called on it anywhere in the codebase -
 * confirmed by repo search 2026-07-06). See the docstring on
 * PrismaClientWithCamelCase in prisma-client.ts for the full explanation and
 * why that middleware should stay disabled: this schema genuinely mixes
 * snake_case and camelCase field names per-model, so a blanket transform
 * would corrupt the models that are already correctly camelCase.
 */

declare global {
  namespace PrismaJson {}
}

export {};
