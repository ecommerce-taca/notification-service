import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { RequestContext } from '../../common/http/request-context';
import { respond } from '../../common/http/api-response';
import { AuthGuard } from '../../infrastructure/auth/auth.guard';
import { InAppService } from './in-app.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { ReadAllDto } from './dto/read-all.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Controller('api/v1/notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly inAppService: InAppService) {}

  @Get()
  async list(@Query() query: ListNotificationsQueryDto) {
    const userId = this.requireUserId();
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    const result = await this.inAppService.list(userId, {
      page,
      size,
      readStatus: query.read_status,
      category: query.category,
    });
    return respond(result.items, { page, size, total: result.total, unread_count: result.unreadCount });
  }

  @Get('unread-count')
  async unreadCount() {
    const userId = this.requireUserId();
    const unreadCount = await this.inAppService.unreadCount(userId);
    return respond({ unread_count: unreadCount });
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id') id: string, @Body() _body: MarkReadDto) {
    const userId = this.requireUserId();
    await this.inAppService.markRead(userId, id);
    return respond({ notification_id: id, read: true });
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Body() body: ReadAllDto) {
    const userId = this.requireUserId();
    const markedCount = await this.inAppService.markAllRead(userId, body.before);
    const unreadCount = await this.inAppService.unreadCount(userId);
    return respond({ marked_count: markedCount }, { unread_count: unreadCount });
  }

  @Get('preferences')
  async listPreferences() {
    const userId = this.requireUserId();
    const preferences = await this.inAppService.listPreferences(userId);
    return respond({ preferences });
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreference(@Body() body: UpdatePreferenceDto) {
    const userId = this.requireUserId();
    const preference = await this.inAppService.updatePreference(userId, body.channel, body.category, body.status);
    return respond(preference);
  }

  private requireUserId(): string {
    const userId = RequestContext.getUserId();
    if (!userId) {
      throw new AppException(ErrorCode.NOTIFICATION_UNAUTHENTICATED);
    }
    return userId;
  }
}
