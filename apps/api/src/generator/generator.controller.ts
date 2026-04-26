import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { GeneratorService } from './generator.service';
import { GenerateProjectDto } from './dto/generate-project.dto';

@Controller('api')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post('generate')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async generate(
    @Body() dto: GenerateProjectDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.generatorService.generate(dto);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${dto.name}.zip"`,
    });
    res.send(buffer);
  }
}
