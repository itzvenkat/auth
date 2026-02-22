import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import mailConfig from '../config/mail.config';

@Module({
    imports: [ConfigModule.forFeature(mailConfig)],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule { }
