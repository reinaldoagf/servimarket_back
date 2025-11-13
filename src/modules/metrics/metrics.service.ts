import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private service: PrismaService) {}

  // 🧠 Caché en memoria
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

  async getPurchasesByCategory(
    businessId?: string | null,
    branchId?: string | null,
    userId?: string | null,
    startDate?: string,
    endDate?: string,
  ) {
    const currentYear = new Date().getFullYear();

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    const start = startDate ? new Date(startDate) : new Date(`${currentYear}-01-01`);
    const end = endDate ? new Date(endDate) : new Date(`${currentYear}-12-31`);

    const cashRegisterWhere: any = {};
    if (businessId) cashRegisterWhere.businessId = businessId;
    if (branchId) cashRegisterWhere.branchId = branchId;

    const cashRegisters = await this.service.cashRegister.findMany({
      where: cashRegisterWhere,
      select: { id: true },
    });
    const cashRegistersIds = cashRegisters.map((b) => b.id);

    // 🧠 Generar clave única de caché
    const cacheKey = `purchases_by_category_${businessId ?? 'all'}_${branchId ?? 'all'}_${userId ?? 'all'}_${currentYear}`;

    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    const isCacheValid = cached && now - cached.timestamp < this.CACHE_TTL_MS;

    let grouped: Record<string, Record<string, number>>;
    console.log({ isCacheValid })
    if (isCacheValid) {
      grouped = cached.data;
    } else {
      // 🔹 1️⃣ Calcular datos históricos (no cambian durante el día)
      const where: any = {
        createdAt: { gte: start, lte: end },
        businessBranchPurchase: {},
      };

      if (userId) where.businessBranchPurchase.userId = userId;
      if (cashRegistersIds.length) where.businessBranchPurchase.cashRegisterId = { in: cashRegistersIds };

      const purchases = await this.service.purchase.findMany({
        where,
        select: {
          price: true,
          unitsOrMeasures: true,
          createdAt: true,
          product: {
            select: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      });

      const allCategories = await this.service.productCategory.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      grouped = {};
      for (const month of months) {
        grouped[month] = {};
        for (const cat of allCategories) {
          grouped[month][cat.name] = 0;
        }
      }

      purchases.forEach((purchase) => {
        const monthName = purchase.createdAt.toLocaleString('es-ES', { month: 'long' });
        const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
        const category = purchase.product?.category?.name ?? 'Sin categoría';
        const total = (purchase.unitsOrMeasures ?? 0) * (purchase.price ?? 0);
        if (!grouped[monthCapitalized]) grouped[monthCapitalized] = {};
        if (!grouped[monthCapitalized][category]) grouped[monthCapitalized][category] = 0;
        grouped[monthCapitalized][category] += total;
      });

      // Guardar en caché
      this.cache.set(cacheKey, { data: grouped, timestamp: now });
    }

    // 🔹 2️⃣ Calcular solo las compras del día actual
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayWhere: any = {
      createdAt: { gte: todayStart, lte: todayEnd },
      businessBranchPurchase: {},
    };
    if (userId) todayWhere.businessBranchPurchase.userId = userId;
    if (cashRegistersIds.length) todayWhere.businessBranchPurchase.cashRegisterId = { in: cashRegistersIds };

    const todayPurchases = await this.service.purchase.findMany({
      where: todayWhere,
      select: {
        price: true,
        unitsOrMeasures: true,
        createdAt: true,
        product: {
          select: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 🔹 3️⃣ Mezclar datos del día actual con los históricos
    const resultGrouped = JSON.parse(JSON.stringify(grouped)); // clonar objeto

    todayPurchases.forEach((purchase) => {
      const monthName = purchase.createdAt.toLocaleString('es-ES', { month: 'long' });
      const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
      const category = purchase.product?.category?.name ?? 'Sin categoría';
      const total = (purchase.unitsOrMeasures ?? 0) * (purchase.price ?? 0);

      if (!resultGrouped[monthCapitalized]) resultGrouped[monthCapitalized] = {};
      if (!resultGrouped[monthCapitalized][category]) resultGrouped[monthCapitalized][category] = 0;
      resultGrouped[monthCapitalized][category] += total;
    });

    // 🔹 4️⃣ Formatear resultado para el frontend
    return months.map((month) => ({
      month,
      categories: Object.entries(resultGrouped[month] ?? {}).map(([category, total]) => ({
        category,
        total,
      })),
    }));
  }
  /* async getPurchasesByCategory(
    businessId?: string | null,
    branchId?: string | null,
    userId?: string | null,
    startDate?: string,
    endDate?: string,
  ) {
    const currentYear = new Date().getFullYear();

    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const start = startDate ? new Date(startDate) : new Date(`${currentYear}-01-01`);
    const end = endDate ? new Date(endDate) : new Date(`${currentYear}-12-31`);

    const cashRegisterWhere: any = {};
    if (businessId) cashRegisterWhere.businessId = businessId;
    if (branchId) cashRegisterWhere.branchId = branchId;

    const cashRegisters = await this.service.cashRegister.findMany({
      where: cashRegisterWhere,
      select: { id: true },
    });

    const cashRegistersIds = cashRegisters.map((b) => b.id);

    // 🔹 Filtros dinámicos
    const where: any = {
      createdAt: { gte: start, lte: end },
      businessBranchPurchase: {},
    };

    if (userId) where.businessBranchPurchase.userId = userId;
    if (cashRegistersIds.length) where.businessBranchPurchase.cashRegisterId = { in: cashRegistersIds };

    // 🔹 1️⃣ Obtener compras filtradas
    const purchases = await this.service.purchase.findMany({
      where,
      select: {
        price: true,
        unitsOrMeasures: true,
        createdAt: true,
        product: {
          select: {
            category: { select: { id: true, name: true } },
          },
        },
        businessBranchPurchase: {
          select: {
            cashRegisterId: true,
            userId: true,
          },
        },
      },
    });

    // 🔹 2️⃣ Obtener todas las categorías
    const allCategories = await this.service.productCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // 🔹 3️⃣ Inicializamos estructura base (meses × categorías)
    const grouped: Record<string, Record<string, number>> = {};
    for (const month of months) {
      grouped[month] = {};
      for (const cat of allCategories) {
        grouped[month][cat.name] = 0;
      }
    }

    // 🔹 4️⃣ Llenamos los totales
    purchases.forEach((purchase) => {
      const monthName = purchase.createdAt.toLocaleString('es-ES', { month: 'long' });
      const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();

      const category = purchase.product?.category?.name ?? 'Sin categoría';
      const total = (purchase.unitsOrMeasures ?? 0) * (purchase.price ?? 0);

      if (!grouped[monthCapitalized]) grouped[monthCapitalized] = {};
      if (!grouped[monthCapitalized][category]) grouped[monthCapitalized][category] = 0;

      if (cashRegistersIds.length) grouped[monthCapitalized][category] += total;
    });

    // 🔹 5️⃣ Formateamos resultado para frontend
    const result = months.map((month) => ({
      month,
      categories: Object.entries(grouped[month]).map(([category, total]) => ({
        category,
        total,
      })),
    }));

    return result;
  } */

  async getInvestmentsByCategory(businessId?: string, branchId?: string) {
    const currentYear = new Date().getFullYear();

    // 🔹 Array con nombres de los meses
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // 1️⃣ Obtener todos los stocks con su producto y categoría
    const stocks = await this.service.productStock.findMany({
      where: {
        branchId: branchId,
      },
      select: {
        branchId: true,
        availables: true,
        salePrice: true,
        purchasePrice: true,
        profitPercentage: true,
        returnOnInvestment: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            priceCalculation: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 2️⃣ Obtener todas las categorías (para incluir las sin inversión)
    const allCategories = await this.service.productCategory.findMany({
      select: { id: true, name: true },
    });

    // 3️⃣ Agrupar por mes, sucursal y categoría
    const grouped: Record<number, Record<number, Record<number, number>>> = {};
    // Estructura: branchId -> month(1-12) -> categoryId -> inversión

    for (const stock of stocks) {
      const branchKey = stock.branchId;
      const categoryKey = stock.product?.categoryId ?? 0;
      const monthKey = new Date(stock.createdAt).getMonth() + 1; // enero=1, diciembre=12

      if (!grouped[branchKey]) grouped[branchKey] = {};
      if (!grouped[branchKey][monthKey]) grouped[branchKey][monthKey] = {};
      if (!grouped[branchKey][monthKey][categoryKey]) grouped[branchKey][monthKey][categoryKey] = 0;

      grouped[branchKey][monthKey][categoryKey] += ((stock.salePrice ?? 0) * (stock.availables ?? 0));
    }

    // 4️⃣ Asegurar que todos los meses y categorías existan (aunque sea con 0 inversión)
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Si no hay datos en grouped (por ejemplo, no hay stocks), igual creamos una estructura base
    if (Object.keys(grouped).length === 0) {
      grouped[branchId ?? 0] = {};
    }

    const result = await Promise.all(
      Object.entries(grouped).map(async ([branchKey, monthsData]) => {
        const monthEntries = await Promise.all(
          months.map(async (monthNumber) => {
            const monthName = monthNames[monthNumber - 1]; // obtener nombre
            const monthCategories = monthsData[monthNumber] || {};

            const categories = await Promise.all(
              allCategories.map(async (cat: any) => {
                const totalInvestment = monthCategories[cat.id] ?? 0;
                return {
                  categoryId: cat.id,
                  categoryName: cat.name,
                  totalInvestment,
                };
              }),
            );

            // También agregamos “Sin categoría”
            const noCategoryInvestment = monthCategories[0] ?? 0;
            categories.push({
              categoryId: 0,
              categoryName: 'Sin categoría',
              totalInvestment: noCategoryInvestment,
            });

            return {
              month: monthName,
              categories,
            };
          }),
        );

        return {
          branchId: branchKey,
          year: currentYear,
          months: monthEntries,
        };
      }),
    );

    return result[0];
  }
}
