// mail.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private templates: Record<string, HandlebarsTemplateDelegate> = {};

  constructor() {
    // configura tu transporter (ejemplo SMTP)
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === 'true', // true para 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async onModuleInit() {
    // precarga y compila plantillas al iniciar para mejorar rendimiento
    await this.loadTemplate(
      'verify-email',
      path.join(process.cwd(), 'dist/mail/templates', 'verify-email.hbs'),
    );
  }

  async loadTemplate(templateName: string, context: any) {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);

    const file = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(file);
    return template(context);
  }

  async sendVerificationEmail(email: string, payload: { name: string; verifyUrl: string }) {
    const html = await this.loadTemplate('verify-email', {
      ...payload,
      logoUrl: 'https://img.freepik.com/vector-premium/icono-grafico-circular-prestamo-isometrico-icono-vector-grafico-circular-prestamo-diseno-web-aislado-sobre-fondo-blanco_96318-48684.jpg',
      companyName: process.env.APP_NAME,
      year: '2025',
    });

    const result = await this.transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Confirma tu cuenta',
      html,
    });

    return {
      data: result,
      message: 'Email enviado satisfactoriamente.',
    };
  }
}
