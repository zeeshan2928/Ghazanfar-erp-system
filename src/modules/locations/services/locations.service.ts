import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '@database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/types/notification-type.enum';
import { CreateCityDto, SearchCitiesDto, UpdateCityDto } from '../dto/location.dto';

@Injectable()
export class LocationsService implements OnModuleInit {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Reads the seed file from disk at boot rather than a static TS import -
  // prisma/ is a sibling of src/, not nested under it, so a relative import
  // would break once tsc emits to dist/. process.cwd() is stable because the
  // app always launches from the project root, in dev and in Docker alike.
  async onModuleInit() {
    const existing = await this.prisma.province.count();
    if (existing > 0) return;

    this.logger.log('Seeding Pakistan provinces/cities reference data (first boot)...');
    const seedPath = path.join(process.cwd(), 'prisma', 'seed-data', 'pakistan-locations.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const data = seedData.provinces as { name: string; cities: string[] }[];
    for (const p of data) {
      const province = await this.prisma.province.create({ data: { name: p.name } });
      await this.prisma.city.createMany({
        data: p.cities.map(name => ({ name, provinceId: province.id, status: 'APPROVED' as const })),
        skipDuplicates: true,
      });
    }
    const cityCount = await this.prisma.city.count();
    this.logger.log(`Seeded ${data.length} provinces, ${cityCount} cities.`);
  }

  async listProvinces() {
    return this.prisma.province.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async searchCities(dto: SearchCitiesDto) {
    return this.prisma.city.findMany({
      where: {
        status: 'APPROVED',
        ...(dto.provinceId ? { provinceId: dto.provinceId } : {}),
        ...(dto.search ? { name: { contains: dto.search, mode: 'insensitive' } } : {}),
      },
      include: { province: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async listPending() {
    return this.prisma.city.findMany({
      where: { status: 'PENDING' },
      include: {
        province: { select: { id: true, name: true } },
        requestedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createApproved(dto: CreateCityDto) {
    await this.assertProvinceExists(dto.provinceId);
    const existing = await this.prisma.city.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' }, provinceId: dto.provinceId },
    });
    if (existing) {
      if (existing.status === 'APPROVED') return existing;
      return this.approve(existing.id);
    }
    return this.prisma.city.create({ data: { name: dto.name, provinceId: dto.provinceId, status: 'APPROVED' } });
  }

  async requestCity(organizationId: number, userId: number, dto: CreateCityDto) {
    await this.assertProvinceExists(dto.provinceId);
    const existing = await this.prisma.city.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' }, provinceId: dto.provinceId },
    });
    if (existing) return existing;

    const city = await this.prisma.city.create({
      data: { name: dto.name, provinceId: dto.provinceId, status: 'PENDING', requestedByUserId: userId },
    });

    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notificationsService.sendNotification(organizationId, {
        userId: admin.id,
        type: NotificationType.GENERAL,
        title: 'New city requested',
        message: `A user requested "${dto.name}" be added as a city. Review it in Pending Cities.`,
        data: { cityId: city.id, cityName: dto.name },
      });
    }

    return city;
  }

  async approve(cityId: number) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City request not found');
    if (city.status === 'APPROVED') return city;
    return this.prisma.city.update({ where: { id: cityId }, data: { status: 'APPROVED' } });
  }

  async update(cityId: number, dto: UpdateCityDto) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');
    if (dto.provinceId) await this.assertProvinceExists(dto.provinceId);
    return this.prisma.city.update({
      where: { id: cityId },
      data: { name: dto.name, provinceId: dto.provinceId },
    });
  }

  private async assertProvinceExists(provinceId: number) {
    const exists = await this.prisma.province.findUnique({ where: { id: provinceId }, select: { id: true } });
    if (!exists) throw new BadRequestException(`Province ${provinceId} does not exist`);
  }
}
