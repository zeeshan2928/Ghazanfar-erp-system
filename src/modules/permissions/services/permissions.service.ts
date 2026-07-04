import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { UserRole } from '@prisma/client';

const DEFAULT_FIELD_PERMISSIONS: Record<string, Record<string, Record<UserRole, boolean>>> = {
  Bill: {
    billNumber: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    customerName: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    amount: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    billDate: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    status: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    totalAmount: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    costPrice: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    margin: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    internalNotes: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    paymentTerms: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
  },
  PurchaseOrder: {
    poNumber: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    vendorName: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    amount: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    poDate: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    status: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    totalAmount: { ADMIN: true, MANAGER: true, STAFF: true, VIEWER: true },
    costPrice: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    margin: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    paymentTerms: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
  },
  User: {
    email: { ADMIN: true, MANAGER: false, STAFF: false, VIEWER: false },
    firstName: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    lastName: { ADMIN: true, MANAGER: true, STAFF: false, VIEWER: false },
    role: { ADMIN: true, MANAGER: false, STAFF: false, VIEWER: false },
  },
};

const ENTITY_PERMISSIONS: Record<UserRole, Record<string, string[]>> = {
  ADMIN: {
    Bill: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'CHANGE_STATUS', 'EXPORT_PDF'],
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
   */
  async getUserRole(organizationId: number, userId: number): Promise<UserRole> {
    try {
      const assignment = await this.prisma.userRoleAssignment.findUnique({
        where: {
          organizationId_userId: { organizationId, userId },
        },
      });

      return assignment?.role || UserRole.VIEWER; // Default to VIEWER
    } catch (error) {
      this.logger.error(`Failed to get user role: ${error.message}`);
      return UserRole.VIEWER;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(organizationId: number, userId: number, role: UserRole) {
    try {
      return await this.prisma.userRoleAssignment.upsert({
        where: {
          organizationId_userId: { organizationId, userId },
        },
        create: {
          organizationId,
          userId,
          role,
        },
        update: { role },
      });
    } catch (error) {
      this.logger.error(`Failed to assign role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user can perform entity action
   */
  async canPerformAction(organizationId: number, userId: number, entity: string, action: string): Promise<boolean> {
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
   */
  async canReadField(organizationId: number, userId: number, entity: string, field: string): Promise<boolean> {
    try {
      const role = await this.getUserRole(organizationId, userId);

      // Check database first
      const fieldPerm = await this.prisma.fieldPermission.findUnique({
        where: {
          organizationId_entity_field_role: {
            organizationId,
            entity,
            field,
            role,
          },
        },
      });

      if (fieldPerm) {
        return fieldPerm.canRead;
      }

      // Fall back to defaults
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
   */
  async canWriteField(organizationId: number, userId: number, entity: string, field: string): Promise<boolean> {
    try {
      const role = await this.getUserRole(organizationId, userId);

      // Check database first
      const fieldPerm = await this.prisma.fieldPermission.findUnique({
        where: {
          organizationId_entity_field_role: {
            organizationId,
            entity,
            field,
            role,
          },
        },
      });

      if (fieldPerm) {
        return fieldPerm.canWrite;
      }

      // Fall back to defaults - staff/viewer can't write restricted fields
      if (role === 'STAFF' || role === 'VIEWER') {
        const restrictedFields = ['costPrice', 'margin', 'paymentTerms', 'internalNotes'];
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
  async getReadableFields(organizationId: number, userId: number, entity: string): Promise<string[]> {
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
  async getWritableFields(organizationId: number, userId: number, entity: string): Promise<string[]> {
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
  async filterReadableFields(organizationId: number, userId: number, entity: string, data: any): Promise<any> {
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
  async validateUpdateData(organizationId: number, userId: number, entity: string, updateData: any): Promise<string[]> {
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
}
