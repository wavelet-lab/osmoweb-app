import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@websdr/nestjs-microservice';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @UseGuards(JwtAuthGuard)
    @Get('/api/hello')
    getHello(): string {
        return this.appService.getHello();
    }
}
