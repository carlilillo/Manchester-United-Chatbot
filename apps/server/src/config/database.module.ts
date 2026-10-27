import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDataSource } from './database';

/** Shared database connection for the server and standalone data workflows. */
@Module({
  imports: [TypeOrmModule.forRootAsync({
    useFactory: () => ({ ...createDataSource().options, autoLoadEntities: false }),
  })],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
