// import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';

// import { AppController } from './app.controller';
// import { AppService } from './app.service';

// import { configuration } from './config/configuration';
// import { validateEnv } from './config/env.validation';

// // Database
// import { DatabaseModule } from './database/database.module';

// // Common global stuff
// import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
// import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
// import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
// import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

// // Middleware
// import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
// import { LoggerMiddleware } from './common/middleware/logger.middleware';

// // Modules
// import { HealthModule } from './modules/health/health.module';
// import { SchoolsModule } from './modules/schools/schools.module';
// import { UsersModule } from './modules/users/users.module';
// import { AuthModule } from './modules/auth/auth.module';
// import { ClassSectionsModule } from './modules/class-sections/class-sections.module';
// import { TeachersModule } from './modules/teachers/teachers.module';
// import { StudentsModule } from './modules/students/students.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// import { SecurityAlertsModule } from './modules/security-alerts/security-alerts.module';
// import { CircularsModule } from './modules/circulars/circulars.module';
// import { TimetablesModule } from './modules/timetables/timetables.module';
// import { RecapsModule } from './modules/recaps/recaps.module';
// import { HomeworkModule } from './modules/homework/homework.module';
// import { AttendanceModule } from './modules/attendance/attendance.module';
// import { BirthdaysModule } from './modules/birthdays/birthdays.module';
// import { ReferralsStudentsModule } from './modules/referrals-students/referrals-students.module';
// import { AdmissionsModule } from './modules/admissions/admissions.module';
// import { ReferralsAseModule } from './modules/referrals-ase/referrals-ase.module';
// import { ExamsModule } from './modules/exams/exams.module';
// import { CmsModule } from './modules/cms/cms.module';
// import { FilesModule } from './modules/files/files.module';

// // Jobs
// import { JobsModule } from './jobs/jobs.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       cache: true,
//       envFilePath: ['.env'],
//       load: [configuration],
//       validate: validateEnv, // IMPORTANT: fails fast if env invalid
//     }),

//     DatabaseModule,

//     // Core
//     HealthModule,

//     // Business modules
//     SchoolsModule,
//     UsersModule,
//     AuthModule,
//     ClassSectionsModule,
//     TeachersModule,
//     StudentsModule,
//     NotificationsModule,
//     SecurityAlertsModule,
//     CircularsModule,
//     TimetablesModule,
//     RecapsModule,
//     HomeworkModule,
//     AttendanceModule,
//     BirthdaysModule,
//     ReferralsStudentsModule,
//     AdmissionsModule,
//     ReferralsAseModule,
//     ExamsModule,
//     CmsModule,
//     FilesModule,

//     // Cron jobs / scheduled tasks
//     JobsModule,
//   ],
//   controllers: [AppController],
//   providers: [
//     AppService,

//     // Global error handling
//     {
//       provide: APP_FILTER,
//       useClass: AllExceptionsFilter,
//     },

//     // Global response shape
//     {
//       provide: APP_INTERCEPTOR,
//       useClass: ResponseTransformInterceptor,
//     },

//     // Global timeouts (prevents hanging requests)
//     {
//       provide: APP_INTERCEPTOR,
//       useClass: TimeoutInterceptor,
//     },
//   ],
// })
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer.apply(RequestIdMiddleware, LoggerMiddleware).forRoutes('*');
//   }
// }












// Newly Added

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';

// Database
import { DatabaseModule } from './database/database.module';

// Common global stuff
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

// Middleware
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

// Modules
import { HealthModule } from './modules/health/health.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassSectionsModule } from './modules/class-sections/class-sections.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { StudentsModule } from './modules/students/students.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SecurityAlertsModule } from './modules/security-alerts/security-alerts.module';
import { CircularsModule } from './modules/circulars/circulars.module';
import { TimetablesModule } from './modules/timetables/timetables.module';
import { RecapsModule } from './modules/recaps/recaps.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { BirthdaysModule } from './modules/birthdays/birthdays.module';
import { ReferralsStudentsModule } from './modules/referrals-students/referrals-students.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { ReferralsAseModule } from './modules/referrals-ase/referrals-ase.module';
import { ExamsModule } from './modules/exams/exams.module';
import { CmsModule } from './modules/cms/cms.module';
import { FilesModule } from './modules/files/files.module';

// Jobs
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: [configuration],
      validate: validateEnv,
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ttl = Number(config.get('security.throttle.ttlSeconds') ?? 60);
        const limit = Number(config.get('security.throttle.limit') ?? 120);
        return [{ ttl, limit }];
      },
    }),

    DatabaseModule,

    HealthModule,

    SchoolsModule,
    UsersModule,
    AuthModule,
    ClassSectionsModule,
    TeachersModule,
    StudentsModule,
    NotificationsModule,
    SecurityAlertsModule,
    CircularsModule,
    TimetablesModule,
    RecapsModule,
    HomeworkModule,
    AttendanceModule,
    BirthdaysModule,
    ReferralsStudentsModule,
    AdmissionsModule,
    ReferralsAseModule,
    ExamsModule,
    CmsModule,
    FilesModule,

    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, LoggerMiddleware).forRoutes('*');
  }
}
