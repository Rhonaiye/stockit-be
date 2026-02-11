
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UsersService } from '../users.service';

@Injectable()
export class UserActivityInterceptor implements NestInterceptor {
    constructor(private usersService: UsersService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user && user.userId) {
            // We don't await this to avoid blocking the request
            this.usersService.recordActivity(user.userId).catch(err => {
                console.error('Failed to record user activity:', err);
            });
        }

        return next.handle();
    }
}
