import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { UserRole } from '@prisma/client';
import { PERMISSION_CATALOG, ALL_PERMISSION_KEYS } from '@common/config/permission-catalog';

// NOTE: this permission matrix was designed for an 8-role model (ADMIN,
// MANAGER, ACCOUNTANT, SALESMAN, WAREHOUSE_STAFF, LABOUR_STAFF, STAFF, VIEWER)
// but the real UserRole enum in schema.prisma only has 6 values (ADMIN,
// SALESMAN, WAREHOUSE, ACCOUNTANT, MANAGER, DATA_ENTRY) - no WAREHOUSE_STAFF,
// LABOUR_STAFF, STAFF, or VIEWER, and DATA_ENTRY has no entry here at all.
// Typed as Record<string, ...> instead of Record<UserRole, ...> so this compiles
// without deleting the extra roles (they may reflect a planned future role
// model) - but this mismatch needs a product decision: either extend UserRole
// to match, or trim this matrix to the real 6 roles and decide what DATA_ENTRY
// gets. Separately: this permission system (canPerformAction/canReadField/
// canWriteField) is not currently enforced anywhere - no controller in the
// codebase applies PermissionGuard or @RequirePermission to a route.
const DEFAULT_FIELD_PERMISSIONS: Record<string, Record<string, Record<string, boolean>>> = {
  Bill: {
    bill_number: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    customerName: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    amount: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    billDate: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    status: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    total_amount: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    cost_price: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    margin: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    internalNotes: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    paymentTerms: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: true,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
  },
  PurchaseOrder: {
    po_number: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    vendor_name: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    amount: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    po_date: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    status: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    total_amount: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: true,
      VIEWER: true,
    },
    cost_price: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    margin: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    paymentTerms: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
  },
  User: {
    email: {
      ADMIN: true,
      MANAGER: false,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    firstName: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    lastName: {
      ADMIN: true,
      MANAGER: true,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
    role: {
      ADMIN: true,
      MANAGER: false,
      ACCOUNTANT: false,
      SALESMAN: false,
      WAREHOUSE_STAFF: false,
      LABOUR_STAFF: false,
      STAFF: false,
      VIEWER: false,
    },
  },
};

const ENTITY_PERMISSIONS: Record<string, Record<string, string[]>> = {
  ADMIN: {
    Bill: [
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'CHANGE_STATUS',
      'EXPORT_PDF',
      'REPRINT',
      'MODIFY',
    ],
    PurchaseOrder: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'CHANGE_STATUS', 'RECEIVE_GOODS'],
    User: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'CHANGE_PASSWORD'],
    Reports: ['READ_ALL', 'EXPORT'],
    AuditLog: ['READ'],
  },
  MANAGER: {
    Bill: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'CHANGE_STATUS', 'EXPORT_PDF'],
    PurchaseOrder: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'CHANGE_STATUS', 'RECEIVE_GOODS'],
    User: ['READ', 'UPDATE_OWN'],
    Reports: ['READ_OWN', 'EXPORT'],
    AuditLog: ['READ'],
  },
  ACCOUNTANT: {
    Bill: ['CREATE', 'READ', 'PRINT_GATEPASS', 'EXPORT_PDF'],
    PurchaseOrder: ['READ'],
    User: ['READ_OWN', 'UPDATE_OWN'],
    Reports: ['READ_OWN', 'EXPORT'],
    AuditLog: ['READ'],
  },
  SALESMAN: {
    Bill: ['READ_OWN'],
    PurchaseOrder: ['READ_OWN'],
    User: ['READ_OWN', 'UPDATE_OWN'],
    Reports: [],
    AuditLog: [],
  },
  WAREHOUSE_STAFF: {
    Bill: ['READ'],
    PurchaseOrder: ['READ'],
    User: ['READ_OWN'],
    Reports: [],
    AuditLog: [],
  },
  LABOUR_STAFF: {
    Bill: ['READ'],
    PurchaseOrder: ['READ'],
    User: ['READ_OWN'],
    Reports: [],
    AuditLog: [],
  },
  STAFF: {
    Bill: ['CREATE', 'READ', 'UPDATE_OWN', 'CHANGE_STATUS'],
    PurchaseOrder: ['CREATE', 'READ', 'UPDATE_OWN', 'CHANGE_STATUS'],
    User: ['READ_OWN', 'UPDATE_OWN'],
    Reports: ['READ_LIMITED'],
    AuditLog: [],
  },
  VIEWER: {
    Bill: ['READ'],
    PurchaseOrder: ['READ'],
    User: ['READ_OWN'],
    Reports: ['READ_LIMITED'],
    AuditLog: [],
  },
};

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get user's role
   * NOTE: there is no separate UserRoleAssignment table in schema.prisma - role
   * lives directly on User.role. Reading it from there instead.
   */
  async getUserRole(organizationId: number, userId: number): Promise<UserRole> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: { role: true },
      });

      return user?.role || UserRole.DATA_ENTRY; // Default to the most restricted real role
    } catch (error) {
      this.logger.error(`Failed to get user role: ${error.message}`);
      return UserRole.DATA_ENTRY;
    }
  }

  /**
   * Assign role to user
   * NOTE: there is no separate UserRoleAssignment table - updates User.role
   * directly instead.
   */
  async assignRole(organizationId: number, userId: number, role: UserRole) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: { id: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found in organization ${organizationId}`);
      }

      return await this.prisma.user.update({
        where: { id: userId },
        data: { role },
      });
    } catch (error) {
      this.logger.error(`Failed to assign role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user can perform entity action
   */
  async canPerformAction(
    organizationId: number,
    userId: number,
    entity: string,
    action: string,
  ): Promise<boolean> {
    try {
      const role = await this.getUserRole(organizationId, userId);
      const permissions = ENTITY_PERMISSIONS[role]?.[entity] || [];
      return permissions.includes(action);
    } catch (error) {
      this.logger.error(`Failed to check entity permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user can read field
   * NOTE: there is no FieldPermission table in schema.prisma for a per-org DB
   * override - falls straight through to the hardcoded defaults below.
   */
  async canReadField(
    organizationId: number,
    userId: number,
    entity: string,
    field: string,
  ): Promise<boolean> {
    try {
      const role = await this.getUserRole(organizationId, userId);

      const defaultPerms = DEFAULT_FIELD_PERMISSIONS[entity]?.[field];
      if (defaultPerms) {
        return defaultPerms[role] || false;
      }

      return true; // Default to allowing if not specified
    } catch (error) {
      this.logger.error(`Failed to check field read permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user can write field
   * NOTE: there is no FieldPermission table in schema.prisma for a per-org DB
   * override - falls straight through to the hardcoded defaults below. The
   * original restricted-role check listed roles (STAFF, LABOUR_STAFF, VIEWER)
   * that don't exist in the real UserRole enum; remapped to the closest real
   * lower-privilege roles (SALESMAN, WAREHOUSE, DATA_ENTRY) - flagged for
   * product review since this is a judgment call, not a verified mapping.
   */
  async canWriteField(
    organizationId: number,
    userId: number,
    entity: string,
    field: string,
  ): Promise<boolean> {
    try {
      const role = await this.getUserRole(organizationId, userId);

      if (role === 'SALESMAN' || role === 'WAREHOUSE' || role === 'DATA_ENTRY') {
        const restrictedFields = ['cost_price', 'margin', 'paymentTerms', 'internalNotes'];
        if (restrictedFields.includes(field)) {
          return false;
        }
      }

      return true; // Default to allowing if not specified
    } catch (error) {
      this.logger.error(`Failed to check field write permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Get readable fields for user
   */
  async getReadableFields(
    organizationId: number,
    userId: number,
    entity: string,
  ): Promise<string[]> {
    try {
      const role = await this.getUserRole(organizationId, userId);
      const fields = Object.keys(DEFAULT_FIELD_PERMISSIONS[entity] || {});
      const readable: string[] = [];

      for (const field of fields) {
        const canRead = await this.canReadField(organizationId, userId, entity, field);
        if (canRead) {
          readable.push(field);
        }
      }

      return readable;
    } catch (error) {
      this.logger.error(`Failed to get readable fields: ${error.message}`);
      return [];
    }
  }

  /**
   * Get writable fields for user
   */
  async getWritableFields(
    organizationId: number,
    userId: number,
    entity: string,
  ): Promise<string[]> {
    try {
      const role = await this.getUserRole(organizationId, userId);
      const fields = Object.keys(DEFAULT_FIELD_PERMISSIONS[entity] || {});
      const writable: string[] = [];

      for (const field of fields) {
        const canWrite = await this.canWriteField(organizationId, userId, entity, field);
        if (canWrite) {
          writable.push(field);
        }
      }

      return writable;
    } catch (error) {
      this.logger.error(`Failed to get writable fields: ${error.message}`);
      return [];
    }
  }

  /**
   * Filter data object to only include readable fields
   */
  async filterReadableFields(
    organizationId: number,
    userId: number,
    entity: string,
    data: any,
  ): Promise<any> {
    try {
      const readable = await this.getReadableFields(organizationId, userId, entity);
      const filtered = {};

      for (const field of readable) {
        if (field in data) {
          filtered[field] = data[field];
        }
      }

      return filtered;
    } catch (error) {
      this.logger.error(`Failed to filter readable fields: ${error.message}`);
      return data;
    }
  }

  /**
   * Mask sensitive field values
   */
  maskSensitiveValue(value: any, dataType: string = 'string'): any {
    if (!value) return value;

    switch (dataType) {
      case 'ssn':
      case 'bank_account':
        return String(value).replace(/\d(?=\d{4})/g, '*');
      case 'email':
        const [name, domain] = String(value).split('@');
        return name.replace(/\d(?=\d{2})/g, '*') + '@' + domain;
      case 'phone':
        return String(value).replace(/\d(?=\d{4})/g, '*');
      default:
        return value;
    }
  }

  /**
   * Get permission summary for user
   */
  async getPermissionsSummary(organizationId: number, userId: number) {
    try {
      const role = await this.getUserRole(organizationId, userId);

      return {
        userId,
        organizationId,
        role,
        entityPermissions: ENTITY_PERMISSIONS[role],
        fieldPermissions: DEFAULT_FIELD_PERMISSIONS,
      };
    } catch (error) {
      this.logger.error(`Failed to get permissions summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get entity permissions for role
   */
  getEntityPermissionsForRole(role: UserRole, entity: string): string[] {
    return ENTITY_PERMISSIONS[role]?.[entity] || [];
  }

  /**
   * Check if update data contains restricted fields
   */
  async validateUpdateData(
    organizationId: number,
    userId: number,
    entity: string,
    updateData: any,
  ): Promise<string[]> {
    try {
      const writable = await this.getWritableFields(organizationId, userId, entity);
      const restricted: string[] = [];

      for (const field of Object.keys(updateData)) {
        if (!writable.includes(field)) {
          restricted.push(field);
        }
      }

      return restricted;
    } catch (error) {
      this.logger.error(`Failed to validate update data: ${error.message}`);
      return [];
    }
  }

  // --- Real, enforced, DB-backed granular permission system ---
  // Everything below is separate from the in-memory ENTITY_PERMISSIONS/
  // DEFAULT_FIELD_PERMISSIONS matrix above (which is unenforced and built
  // against a role model that doesn't match the real UserRole enum). This
  // is backed by the actual UserPermission table and is what
  // ActionPermissionGuard checks against.

  getPermissionCatalog() {
    return PERMISSION_CATALOG;
  }

  // Merges the catalog with this user's stored overrides - default-allow,
  // so a key with no row is reported as granted:true.
  async getUserPermissionOverrides(organizationId: number, userId: number) {
    const rows = await this.prisma.userPermission.findMany({
      where: { organizationId, userId },
    });
    const overrideByKey = new Map(rows.map((r) => [r.permissionKey, r.granted]));

    return PERMISSION_CATALOG.map((mod) => ({
      module: mod.module,
      label: mod.label,
      permissions: mod.permissions.map((p) => ({
        key: p.key,
        label: p.label,
        granted: overrideByKey.has(p.key) ? overrideByKey.get(p.key)! : true,
      })),
    }));
  }

  // Caller must be ADMIN - checked by the controller before calling this,
  // mirroring the existing assignRole check pattern.
  async setUserPermissionOverrides(
    organizationId: number,
    userId: number,
    overrides: { key: string; granted: boolean }[],
  ) {
    const validKeys = new Set(ALL_PERMISSION_KEYS);
    const filtered = overrides.filter((o) => validKeys.has(o.key));

    await this.prisma.$transaction(
      filtered.map((o) =>
        this.prisma.userPermission.upsert({
          where: { userId_permissionKey: { userId, permissionKey: o.key } },
          create: { organizationId, userId, permissionKey: o.key, granted: o.granted },
          update: { granted: o.granted },
        }),
      ),
    );

    return this.getUserPermissionOverrides(organizationId, userId);
  }

  // Org-wide summary of custom restrictions in place - the Administration
  // Dashboard's "users with custom permission restrictions" KPI + most-
  // restricted-permissions table. Only granted:false rows are real
  // restrictions (default-allow model - see UserPermission in schema.prisma).
  async getPermissionOverrideStats(organizationId: number) {
    const restrictedRows = await this.prisma.userPermission.findMany({
      where: { organizationId, granted: false },
      select: { userId: true, permissionKey: true },
    });

    const usersWithRestrictions = new Set(restrictedRows.map((r) => r.userId)).size;

    const byKey = new Map<string, number>();
    restrictedRows.forEach((r) => byKey.set(r.permissionKey, (byKey.get(r.permissionKey) || 0) + 1));

    return {
      usersWithRestrictions,
      totalRestrictions: restrictedRows.length,
      mostRestrictedKeys: Array.from(byKey.entries())
        .map(([permissionKey, count]) => ({ permissionKey, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}
