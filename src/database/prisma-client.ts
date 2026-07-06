import { PrismaClient } from '@prisma/client';

/**
 * DEAD CODE - DO NOT WIRE THIS UP. Kept only because check:hidden-errors
 * flagged its one type error; not because it should ever run.
 *
 * This class + prisma-transform.middleware.ts + prisma.types.ts form an
 * abandoned, never-activated attempt at a universal camelCase<->snake_case
 * Prisma transform. It is not referenced by PrismaService (the class actually
 * injected everywhere via DI) or anywhere else in the codebase - confirmed by
 * a full repo search on 2026-07-06. Its own docstring used to claim the
 * conversion "handles bidirectional conversion" at runtime; it never has,
 * since `prisma.$use(transformFieldsMiddleware)` is never called anywhere.
 * This unverified claim is very likely the original source of CLAUDE.md's
 * incorrect "Prisma automatically converts snake_case to camelCase" claim,
 * which caused ~27 real bugs found and fixed the same day this was traced.
 *
 * Activating this middleware now would make things WORSE, not better: the
 * real schema mixes snake_case models (Bill, PurchaseOrder, Vendor, ...) with
 * genuinely camelCase models (Customer, Budget, ChartOfAccount, ProductCategory,
 * CommissionCalculation, ...). This middleware transforms every key
 * indiscriminately with no per-model awareness, so it would corrupt every
 * already-correct camelCase field (e.g. Customer.customerType ->
 * customer_type, which doesn't exist) while doing nothing useful for the
 * snake_case models (which already work correctly when accessed with their
 * real field names, as fixed throughout this codebase).
 */
export class PrismaClientWithCamelCase extends PrismaClient {}

export default PrismaClientWithCamelCase;
