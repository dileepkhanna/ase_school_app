import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    const u = await this.usersService.getMe(user);
    return {
      id: u.id,
      role: u.role,
      email: u.email,
      phone: u.phone,
      schoolId: u.schoolId,
      schoolCode: u.schoolCode,
      mustChangePassword: u.mustChangePassword,
      biometricsEnabled: u.biometricsEnabled,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    const u = await this.usersService.updateMe(user, dto);
    return {
      id: u.id,
      phone: u.phone,
      biometricsEnabled: u.biometricsEnabled,
      updatedAt: u.updatedAt,
    };
  }

  /**
   * Supports both:
   * - POST /users/me/change-password
   * - POST /users/change-password
   */
  @Post('me/change-password')
  async changePasswordMe(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(user, dto);
    return { message: 'Password updated successfully' };
  }

  @Post('change-password')
  async changePasswordAlias(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(user, dto);
    return { message: 'Password updated successfully' };
  }
}
