import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QueueModule } from '../queue/queue.module';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [QueueModule, OrganizationsModule, AiModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, OrganizationGuard],
  exports: [QuizzesService],
})
export class QuizzesModule {}