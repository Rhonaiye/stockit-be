
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invite, InviteSchema } from './schemas/invite.schema';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Invite.name, schema: InviteSchema }]),
        AuditLogsModule
    ],
    controllers: [InvitesController],
    providers: [InvitesService],
    exports: [InvitesService],
})
export class InvitesModule { }
