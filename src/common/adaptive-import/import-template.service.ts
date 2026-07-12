import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AdaptiveImportService } from './adaptive-import.service';
import { ColumnMapping, DetectedColumn, ImportModule, Structure } from './adaptive-import.types';

// Remembers confirmed column mappings so a recurring export layout is
// recognized and auto-applied next time. Mappings are stored by HEADER NAME
// (not column index) so they survive column reordering; on reuse the header
// names are resolved back to this file's actual column indexes.
@Injectable()
export class ImportTemplateService {
  constructor(
    private prisma: PrismaService,
    private engine: AdaptiveImportService,
  ) {}

  async findMatching(organizationId: number, module: ImportModule, signature: string) {
    return this.prisma.importMappingTemplate.findUnique({
      where: { organizationId_module_signature: { organizationId, module, signature } },
    });
  }

  // Convert a saved field->headerName mapping into field->columnIndex for the
  // file currently being analyzed (match on normalized header text).
  resolveTemplateMapping(
    storedMapping: Record<string, string>,
    columns: DetectedColumn[],
  ): ColumnMapping {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    const byHeader = new Map(columns.map(c => [norm(c.header), c.index]));
    const mapping: ColumnMapping = {};
    for (const [field, header] of Object.entries(storedMapping)) {
      const idx = byHeader.get(norm(header));
      if (idx !== undefined) mapping[field as keyof ColumnMapping] = idx;
    }
    return mapping;
  }

  async saveTemplate(
    organizationId: number,
    module: ImportModule,
    signature: string,
    label: string,
    structure: Structure,
    mapping: ColumnMapping,
    columns: DetectedColumn[],
  ): Promise<void> {
    // Persist field -> header name (robust to reordering).
    const headerByIndex = new Map(columns.map(c => [c.index, c.header]));
    const stored: Record<string, string> = {};
    for (const [field, idx] of Object.entries(mapping)) {
      if (typeof idx === 'number') {
        const header = headerByIndex.get(idx);
        if (header) stored[field] = header;
      }
    }
    await this.prisma.importMappingTemplate.upsert({
      where: { organizationId_module_signature: { organizationId, module, signature } },
      create: { organizationId, module, signature, label, structure, mapping: stored },
      update: { label, structure, mapping: stored },
    });
  }
}
