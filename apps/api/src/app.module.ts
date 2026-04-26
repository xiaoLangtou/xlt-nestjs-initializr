import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { GeneratorModule } from './generator/generator.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    GeneratorModule,
  ],
})
export class AppModule {}
