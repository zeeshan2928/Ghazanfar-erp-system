import { Controller, Post, Get, Put, Delete, Body, UseGuards, Param, Query } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  async getCurrentUser(@OrgContext() orgContext: any) {
    return orgContext;
  }

  @UseGuards(JwtGuard)
  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 10;
    const filters = search ? { search } : {};

    return this.usersService.findAll(orgContext.organizationId, skipNum, takeNum, filters);
  }

  @UseGuards(JwtGuard)
  @Get('stats')
  async getStats(@OrgContext() orgContext: any) {
    return this.usersService.getStats(orgContext.organizationId);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @OrgContext() orgContext?: any) {
    return this.usersService.findById(parseInt(id, 10), orgContext?.organizationId);
  }

  @UseGuards(JwtGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @OrgContext() orgContext?: any,
  ) {
    return this.usersService.update(parseInt(id, 10), updateUserDto, orgContext?.organizationId);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @OrgContext() orgContext?: any) {
    return this.usersService.remove(parseInt(id, 10), orgContext?.organizationId);
  }

  @UseGuards(JwtGuard)
  @Post(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @OrgContext() orgContext?: any,
  ) {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    return this.usersService.changePassword(
      parseInt(id, 10),
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
      orgContext?.organizationId,
    );
  }
}
