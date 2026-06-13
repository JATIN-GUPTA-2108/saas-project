import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { LessonsService } from './lessons.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [CoursesController],
  providers: [CoursesService, LessonsService, OrganizationGuard],
  exports: [CoursesService, LessonsService],
})
export class CoursesModule {}
