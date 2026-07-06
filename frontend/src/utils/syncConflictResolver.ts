/**
 * Sync Conflict Resolver
 * Handles conflicts when syncing offline-first data
 */

export interface ConflictResolutionStrategy {
  strategy: 'remote-wins' | 'local-wins' | 'merge' | 'ask';
  reason?: string;
}

export interface SyncConflict {
  id: string;
  type: 'gate-pass' | 'inventory';
  localVersion: any;
  remoteVersion: any;
  timestamp: number;
}

export const syncConflictResolver = {
  /**
   * Detect conflicts between local and remote versions
   */
  detectConflict(local: any, remote: any): boolean {
    if (!local || !remote) return false;

    // Check if versions differ
    return (
      JSON.stringify(local) !== JSON.stringify(remote) &&
      local.updatedAt !== remote.updatedAt
    );
  },

  /**
   * Resolve conflict based on strategy
   */
  resolveConflict(
    conflict: SyncConflict,
    strategy: 'remote-wins' | 'local-wins' | 'merge'
  ): any {
    switch (strategy) {
      case 'remote-wins':
        // Use server version (safer for critical data)
        return conflict.remoteVersion;

      case 'local-wins':
        // Use local version (for optimistic updates)
        return conflict.localVersion;

      case 'merge':
        // Deep merge both versions
        return this.deepMerge(conflict.localVersion, conflict.remoteVersion);

      default:
        return conflict.remoteVersion;
    }
  },

  /**
   * Deep merge two objects, preferring newer timestamps
   */
  deepMerge(local: any, remote: any): any {
    const merged = { ...local };

    for (const key in remote) {
      if (remote.hasOwnProperty(key)) {
        if (typeof remote[key] === 'object' && remote[key] !== null) {
          merged[key] = this.deepMerge(
            local[key] || {},
            remote[key]
          );
        } else {
          // Use remote if it's newer
          const remoteTime = remote[`${key}UpdatedAt`] || remote.updatedAt || 0;
          const localTime = local[`${key}UpdatedAt`] || local.updatedAt || 0;
          merged[key] = remoteTime > localTime ? remote[key] : local[key];
        }
      }
    }

    return merged;
  },

  /**
   * Get default strategy for entity type
   */
  getDefaultStrategy(
    type: 'gate-pass' | 'inventory'
  ): ConflictResolutionStrategy {
    switch (type) {
      case 'gate-pass':
        // Gate passes: server wins (critical for fulfillment)
        return {
          strategy: 'remote-wins',
          reason: 'Gate pass state must match server for fulfillment',
        };

      case 'inventory':
        // Inventory: merge (keep local picks, update global state)
        return {
          strategy: 'merge',
          reason: 'Combine local inventory adjustments with server updates',
        };

      default:
        return { strategy: 'remote-wins' };
    }
  },

  /**
   * Record conflict in audit log
   */
  logConflict(conflict: SyncConflict): void {
    const log = {
      timestamp: conflict.timestamp,
      type: conflict.type,
      conflictId: conflict.id,
      local: conflict.localVersion,
      remote: conflict.remoteVersion,
    };

    // Store in IndexedDB for later analysis
    console.log('Conflict logged:', log);
  },

  /**
   * Batch resolve multiple conflicts
   */
  resolveMultiple(
    conflicts: SyncConflict[],
    strategyMap?: Map<string, ConflictResolutionStrategy>
  ): Map<string, any> {
    const resolved = new Map<string, any>();

    for (const conflict of conflicts) {
      const strategy =
        strategyMap?.get(conflict.id) ||
        this.getDefaultStrategy(conflict.type);

      const result = this.resolveConflict(
        conflict,
        strategy.strategy
      );
      resolved.set(conflict.id, result);

      this.logConflict(conflict);
    }

    return resolved;
  },

  /**
   * Check if conflict is critical
   */
  isCritical(conflict: SyncConflict): boolean {
    // Gate passes are critical
    if (conflict.type === 'gate-pass') {
      return true;
    }

    // Inventory with large differences is critical
    if (
      conflict.type === 'inventory' &&
      Math.abs(
        (conflict.remoteVersion.available || 0) -
          (conflict.localVersion.available || 0)
      ) > 100
    ) {
      return true;
    }

    return false;
  },

  /**
   * Create audit entry for conflict resolution
   */
  createAuditEntry(
    conflict: SyncConflict,
    resolution: 'remote-wins' | 'local-wins' | 'merge'
  ): any {
    return {
      id: `audit-${conflict.id}-${Date.now()}`,
      conflictId: conflict.id,
      type: `conflict-${resolution}`,
      timestamp: Date.now(),
      localVersion: conflict.localVersion,
      remoteVersion: conflict.remoteVersion,
      resolutionStrategy: resolution,
    };
  },
};
