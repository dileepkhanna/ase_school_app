import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ------------------------
  // Login
  // ------------------------
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ------------------------
  // Refresh (validated by refresh strategy)
  // ------------------------
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@CurrentUser() user: RequestUser, @Body() dto: RefreshDto) {
    return this.authService.refresh(user, dto);
  }

  // ------------------------
  // Logout
  // ------------------------
  @Post('logout')
  @UseGuards(JwtAccessGuard)
  async logout(@CurrentUser() user: RequestUser, @Body() dto: LogoutDto) {
    await this.authService.logout(user, dto);
    return { message: 'Logged out successfully' };
  }

  // ------------------------
  // Forgot password -> send OTP (public)
  // ------------------------
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    // Generic success (anti-enumeration)
    return { message: 'If the account exists, an OTP has been sent.' };
  }

  // ------------------------
  // Verify OTP (public)
  // ------------------------
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ------------------------
  // Reset password using OTP (public)
  // ------------------------
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'If OTP was valid, password has been reset.' };
  }

  // ------------------------
  // Register / Update device push token (auth)
  // ------------------------
  @Post('register-device')
  @UseGuards(JwtAccessGuard)
  async registerDevice(@CurrentUser() user: RequestUser, @Body() dto: RegisterDeviceDto) {
    await this.authService.registerDevice(user, dto);
    return { message: 'Device registered' };
  }
}
