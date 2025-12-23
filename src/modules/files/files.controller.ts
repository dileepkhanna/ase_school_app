import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SchoolScopeGuard } from '../../common/guards/school-scope.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';

import { FilesService } from './files.service';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import { FinalizeUploadDto } from './dto/finalize-upload.dto';

@Controller('files')
@UseGuards(JwtAccessGuard, RolesGuard, SchoolScopeGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class FilesController {
  constructor(private readonly service: FilesService) {}

  /**
   * Step 1: get presigned PUT URL
   * POST /files/presigned
   */
  @Post('presigned')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async presigned(@CurrentUser() user: RequestUser, @Body() dto: CreatePresignedUrlDto) {
    return this.service.createPresignedUrl(user, dto);
  }

  /**
   * Step 2: finalize upload (optional)
   * POST /files/finalize
   */
  @Post('finalize')
  @Roles(Role.PRINCIPAL, Role.TEACHER, Role.STUDENT)
  async finalize(@CurrentUser() user: RequestUser, @Body() dto: FinalizeUploadDto) {
    return this.service.finalizeUpload(user, dto);
  }
}
