import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { QuizzesService } from './quizzes.service';
import { IsNotEmpty, IsString } from 'class-validator';

class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;
}


@ApiTags('quizzes')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true })
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @UseGuards(PermissionsGuard)
  @RequirePermissions('course:update')
  @Post('generate')
  generate(@OrgId() orgId: string, @Body() dto: GenerateQuizDto) {
    return this.quizzes.generate(orgId, dto);
  }

  @Post('lessons/:lessonId/summary')
  generateSummary(
    @OrgId() orgId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.quizzes.generateLessonSummary(orgId, lessonId);
  }

  @Post('lessons/:lessonId/key-concepts')
  generateKeyConcepts(
    @OrgId() orgId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.quizzes.generateKeyConcepts(orgId, lessonId);
  }

  @Post('lessons/:lessonId/ask')
  askQuestion(
    @OrgId() orgId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: AskQuestionDto,
  ) {
    return this.quizzes.answerQuestion(orgId, lessonId, dto.question);
  }

  @Get('lesson/:lessonId')
  async findByLesson(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('lessonId') lessonId: string,
  ) {
    const includeAnswers = await this.quizzes.canViewAnswers(user.id, orgId);
    return this.quizzes.findByLesson(orgId, lessonId, includeAnswers);
  }

  @Get(':quizId')
  async findOne(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('quizId') quizId: string,
  ) {
    const includeAnswers = await this.quizzes.canViewAnswers(user.id, orgId);
    return this.quizzes.findOne(orgId, quizId, includeAnswers);
  }

  @Post(':quizId/attempts')
  submit(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.quizzes.submitAttempt(orgId, user.id, quizId, dto);
  }

  @Get(':quizId/attempts/me')
  myAttempt(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.quizzes.myAttempt(orgId, user.id, quizId);
  }
}