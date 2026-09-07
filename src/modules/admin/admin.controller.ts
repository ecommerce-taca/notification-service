import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { respond } from '../../common/http/api-response';
import { AdminGuard } from '../../infrastructure/auth/admin.guard';
import { AuthGuard } from '../../infrastructure/auth/auth.guard';
import { AdminService } from './admin.service';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';

@Controller('api/v1/admin/notifications')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('deliveries')
  async listDeliveries(@Query() query: ListDeliveriesQueryDto) {
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    const result = await this.adminService.listDeliveries({
      page,
      size,
      status: query.status,
      channel: query.channel,
      template: query.template,
      recipientHash: query.recipient_hash,
      from: query.from,
      to: query.to,
    });
    return respond(result.items, { page, size, total: result.total });
  }
}
