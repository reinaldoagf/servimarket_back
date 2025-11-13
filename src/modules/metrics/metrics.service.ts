import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private service: PrismaService) {}

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

    // 🔹 Filtro base para la tabla agregada
    const where: any = {
      createdAt: { gte: start, lte: end },
    };
    if (businessId) where.businessId = businessId;
    if (branchId) where.branchId = branchId;
    if (userId) where.userId = userId;

    // 🔹 Consulta agrupada: mes + categoría
   /*  const purchasesByCategory = await this.service.purchaseByCategory.groupBy({
      by: ['categoryId'],
      where,
      _sum: { total: true },
    }); */

    // 🔹 Cargar las categorías relacionadas
    const categories = await this.service.productCategory.findMany({
      select: { id: true, name: true },
    });

    // 🔹 Obtener las compras del año actual (ordenadas por fecha)
    const records = await this.service.purchaseByCategory.findMany({
      where,
      select: {
        total: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
      },
    });

    // 🔹 Inicializar estructura base
    const grouped: Record<string, Record<string, number>> = {};
    for (const month of months) {
      grouped[month] = {};
      for (const cat of categories) {
        grouped[month][cat.name] = 0;
      }
    }

    // 🔹 Rellenar la estructura con los totales agrupados por mes
    for (const record of records) {
      const monthName = record.createdAt.toLocaleString('es-ES', { month: 'long' });
      const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();

      const categoryName = record.category?.name ?? 'Sin categoría';
      const total = record.total ?? 0;

      if (!grouped[monthCapitalized]) grouped[monthCapitalized] = {};
      if (!grouped[monthCapitalized][categoryName]) grouped[monthCapitalized][categoryName] = 0;

      grouped[monthCapitalized][categoryName] += total;
    }

    // 🔹 Formatear resultado para el frontend
    return months.map((month) => ({
      month,
      categories: Object.entries(grouped[month] ?? {}).map(([category, total]) => ({
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
