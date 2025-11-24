// seed.ts
import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  omit: {
    user: {
      password: true,
    },
  },
});

async function main(): Promise<void> {
  const passwordPlain = process.env.USER_DEFAULT_PASSWORD ?? '12345678';
  const hashedPassword: string = await bcrypt.hash(passwordPlain, 10);

  /* const usersData = Array.from({ length: 5 }).map((_, index) => ({
    email: `user${index + 1}@test.com`,
    name: `User ${index + 1}`,
    username: `username${index + 1}`,
    dni: `${index + 1}0000`,
    state: `Bolívar`,
    city: `Ciudad Guayana`,
    password: hashedPassword,
    status: UserStatus.activo,
  }));

  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true, // evita errores si corres varias veces
  }); */
  await prisma.setting.createMany({
    data: [{
      key: 'iva',
      floatValue: 16
    }],
    skipDuplicates: true,
  });
  console.log('✅ Configuraciones creadas');

  await prisma.currency.createMany({
    data: [
      {
        coin: 'dollar',
        code: 'USD',
        symbol: '$',
        name: 'Dólar',
        exchange: 1,
        country: 'estados unidos',
      },
      {
        coin: 'bolivares',
        code: 'VEF',
        symbol: 'Bs',
        name: 'Bolívar',
        exchange: 1,
        country: 'venezuela',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Monedas creadas');

  // Validar nombre único
  const usdCurrency = await prisma.currency.findUnique({
    where: { coin: 'dollar' ,code: 'USD', symbol: '$', },
  });

  await prisma.billPaymentMethod.create({
    data: {
      name: 'divisa',
      image: null,
      country: null,
      currencyId: usdCurrency?.id ?? null,
    },
  });

  const bsCurrency = await prisma.currency.findUnique({
    where: { coin: 'bolivares' ,code: 'VEF', symbol: 'Bs', },
  });

  await prisma.billPaymentMethod.deleteMany();

  await prisma.billPaymentMethod.upsert({
    where: { name: 'efectivo' },
    update: {},
    create: {
      name: 'efectivo',
      image: null,
      country: 'venezuela',
      currencyId: bsCurrency?.id ?? null,
    },
  });

  await prisma.billPaymentMethod.upsert({
    where: { name: 'pago móvil' },
    update: {},
    create: {
      name: 'pago móvil',
      image: null,
      country: 'venezuela',
      currencyId: bsCurrency?.id ?? null,
    },
  });

  await prisma.billPaymentMethod.upsert({
    where: { name: 'transferencia bancaria' },
    update: {},
    create: {
      name: 'transferencia bancaria',
      image: null,
      country: 'venezuela',
      currencyId: bsCurrency?.id ?? null,
    },
  });

  console.log('✅ Metodos de pago de facturas creadas');

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@servimerca.com',
        name: 'Administrador',
        username: 'admin',
        dni: '0000000',
        state: `Bolívar`,
        city: `Ciudad Guayana`,
        password: hashedPassword,
        status: UserStatus.activo,
        hasAllPermissions: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Usuarios creados con contraseña encriptada');

/* 
  await prisma.permission.createMany({
    data: [
      {
        type: 'vista',
      },
      {
        type: 'actualizar',
      },
      {
        type: 'eliminar',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Permisos creados exitosamente');

  await prisma.productBrand.createMany({
    data: [
      {
        name: 'FritoLay',
      },
      {
        name: 'Minalba',
      },
      {
        name: 'Lipton',
      },
      {
        name: 'Flips',
      },
      {
        name: 'PAN',
      },
      {
        name: 'ACE',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Marcas creadas exitosamente');

  await prisma.productCategory.createMany({
    data: [
      {
        name: 'Productos de Limpieza',
      },
      {
        name: 'Dulces',
      },
      {
        name: 'Bebidas',
      },
      {
        name: 'Alimentos',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Categorías creadas exitosamente'); */
}

main()
  .catch((e: unknown) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
