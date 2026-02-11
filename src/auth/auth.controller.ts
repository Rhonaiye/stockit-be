import { Controller, Request, Post, UseGuards, Body, UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { UserRole } from '../users/schemas/user.schema';
import { InvitesService } from '../invites/invites.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private companiesService: CompaniesService,
        private invitesService: InvitesService
    ) { }

    @Post('login')
    async login(@Body() req) {
        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        const existingUser = await this.usersService.findOne(registerDto.email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const company = await this.companiesService.create(registerDto.companyName, registerDto.email);

        return this.usersService.create({
            name: registerDto.name,
            email: registerDto.email,
            password: registerDto.password,
            role: UserRole.OWNER,
            companyId: company._id.toString()
        });
    }

    @Post('join')
    async join(@Body() body: any) {
        const { name, email, password, token } = body;

        // 1. Validate the invite link
        const invite = await this.invitesService.validateInvite(token);

        // 2. Check if user already exists
        const existingUser = await this.usersService.findOne(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // 3. Create the user
        const user = await this.usersService.create({
            name,
            email,
            password,
            role: invite.role,
            companyId: invite.companyId,
            branchId: invite.branchId
        });

        // 4. Mark invite as used
        await this.invitesService.markAsUsed(token);

        return {
            message: 'Successfully joined company',
            user: {
                id: (user as any)._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }


}
