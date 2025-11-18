import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';
import { Prisma } from '@prisma/client';

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  username: true,
  hasAllPermissions: true,
  status: true,
  dni: true,
  dniFile: true,
  createdAt: true,
  country: true,
  state: true,
  city: true,
  roleId: true,
  role: true,
  businessId: true,
  avatar: true,
  settings: true,
  verificationToken: true,
  business: { include: { branches: { include: { cashRegisters: true } }, settings: true } },
  collaborations: {include:{branch:{include:{business: true, settings: true, cashRegisters: true}},cashRegister: true}},
};

@Injectable()
export class AuthService {
  constructor(
    private readonly service: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async verifyEmail(token: string) {
    const trimmedToken = token.trim();

    const user = await this.service.user.findFirst({
      where: { verificationToken: trimmedToken, status: 'inactivo' },
      select: { id: true, verificationToken: true, email: true, name: true },
    });

    if (!user) throw new BadRequestException('Invalid or expired token');

    return {
      message: 'Cuenta verificada. Ya puedes iniciar sesión.',
      data: await this.service.user.update({
        where: { id: user.id },
        select: { id: true, verificationToken: true, email: true, name: true },
        data: {
          status: 'activo',
          emailVerifiedAt: new Date(),
          verificationToken: null,
        },
      }),
    };
  }
  async register(dto: RegisterDto) {
    // verificar email duplicado
    const emailExist = await this.service.user.findUnique({ where: { email: dto.email } });
    if (emailExist) throw new BadRequestException('Email already registered');

    const usernameExist = await this.service.user.findUnique({ where: { username: dto.username } });
    if (usernameExist) throw new BadRequestException('Username already registered');

    const dniExist = await this.service.user.findUnique({ where: { dni: dto.dni } });
    if (dniExist) throw new BadRequestException('DNI already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    // token de verificación
    const verificationToken = crypto.randomUUID();

    const data: Prisma.UserCreateInput = {
      email: dto.email,
      name: dto.name,
      username: dto.username,
      dni: dto.dni,
      country: dto.country,
      city: dto.city,
      state: dto.state,
      password: hashed,
      status: 'inactivo',
      verificationToken: `${verificationToken}`,
    };

    const user = await this.service.user.create({ data });

    // 🔄 Vincular compras por DNI...
    await this.linkPurchases(dto.dni, user.id);

    // 📧 Enviar email de verificación
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email/${verificationToken}`;

    if(user?.email && user?.name) {
      await this.mailService.sendVerificationEmail(user.email, {
        name: user.name,
        verifyUrl,
      });
    }

    return {
      message: 'Cuenta creada. Revisa tu email para activar tu cuenta.',
    };
  }

  // extra
  private async linkPurchases(dni: string, userId: string) {
    const purchases = await this.service.businessBranchPurchase.findMany({ where: { clientDNI: dni } });

    await Promise.all(
      purchases.map(p =>
        this.service.businessBranchPurchase.update({
          where: { id: p.id },
          data: { userId },
        }),
      ),
    );

    const purchasesByCategory = await this.service.purchaseByCategory.findMany({ where: { userRef: dni } });

    await Promise.all(
      purchasesByCategory.map(p =>
        this.service.purchaseByCategory.update({
          where: { id: p.id },
          data: { userId },
        }),
      ),
    );
  }
  async validateUserByEmail(email: string, plainPassword: string) {
    const user = await this.service.user.findUnique({ where: { email } });
    if (!user) return null;

    const isMatch = await bcrypt.compare(plainPassword, user.password);
    if (!isMatch) return null;

    // devolver sin password
    const { ...userSafe } = user;
    return userSafe;
  }

  async login(dto: LoginDto) {
    const user = await this.service.user.findUnique({
      where: { email: dto.email },
      include: {
        business: {
          include: {
            branches: {
              include: { cashRegisters: true },
            }, // Trae todos los branches del business
            settings: true,
          },
        },
        collaborations: {
          include: {
            branch: {
              include: {
                business: true,
                settings: true,
                cashRegisters: true,
              },
            },
            cashRegister: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'inactivo') throw new UnauthorizedException('Revisa tu email para activar tu cuenta.');
    const token = this.signToken(user.id, user.email);
    return { access_token: token, user: user };
  }

  async updateProfile(userId: string, dto: UpdateAuthDto) {
    const user = await this.service.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const data: UpdateAuthDto = {};

    // Si se va a cambiar la contraseña, verificar primero
    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to change password');
      }

      const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      data.password = await bcrypt.hash(dto.password, 10);
    }

    // Actualizar campos opcionales (solo los permitidos)
    const allowedFields = [
      'name',
      'email',
      'username',
      'dni',
      'country',
      'state',
      'city',
      'avatar',
    ];

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field];
      }
    }

    const updated = await this.service.user.update({
      where: { id: userId },
      data,
      select: SELECT_FIELDS,
    });

    return { message: 'Profile updated successfully', user: updated };
  }

  async me(req: any) {
    if (req.user){
      const user = await this.service.user.findUnique({
        where: { email: req.user.email },
        select: SELECT_FIELDS,
      });
      if (!user) throw new UnauthorizedException('Invalid credentials');
      const userSafe = (({ ...rest }) => rest)(user);
      const token = this.signToken(user.id, user.email);
      return { access_token: token, user: userSafe };
    }
    return { access_token: null, user: null };
  }

  signToken(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }
}
