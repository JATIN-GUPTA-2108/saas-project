import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { OrgId } from '../common/decorators/org-id.decorator';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CoursesService } from './courses.service';
import { LessonsService } from './lessons.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('courses')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true })
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly lessons: LessonsService,
  ) {}

  @Get()
  findAll(@OrgId() orgId: string, @Query() query: CourseQueryDto) {
    return this.courses.findAll(orgId, query);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:create')
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.courses.create(orgId, user.id, dto);
  }

  @Get(':courseId')
  findOne(@OrgId() orgId: string, @Param('courseId') courseId: string) {
    return this.courses.findOne(orgId, courseId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Patch(':courseId')
  update(
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(orgId, courseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:publish')
  @Post(':courseId/publish')
  publish(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.courses.publish(orgId, user.id, courseId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Post(':courseId/archive')
  archive(@OrgId() orgId: string, @Param('courseId') courseId: string) {
    return this.courses.archive(orgId, courseId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Delete(':courseId')
  remove(@OrgId() orgId: string, @Param('courseId') courseId: string) {
    return this.courses.remove(orgId, courseId);
  }

  @Get(':courseId/lessons')
  listLessons(@OrgId() orgId: string, @Param('courseId') courseId: string) {
    return this.lessons.findAll(orgId, courseId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Post(':courseId/lessons')
  createLesson(
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessons.create(orgId, courseId, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Patch(':courseId/lessons/:lessonId')
  updateLesson(
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessons.update(orgId, courseId, lessonId, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Delete(':courseId/lessons/:lessonId')
  deleteLesson(
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessons.remove(orgId, courseId, lessonId);
  }

  @Post(':courseId/lessons/:lessonId/progress')
  updateProgress(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.lessons.updateProgress(orgId, user.id, courseId, lessonId, dto);
  }

  @Get(':courseId/progress')
  courseProgress(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.lessons.getCourseProgress(orgId, user.id, courseId);
  }
}
