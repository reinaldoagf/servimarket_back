import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { BusinessModule } from './modules/business/business.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CollaboratorsModule } from './modules/collaborators/collaborators.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PendingsModule } from './modules/pendings/pendings.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductStockModule } from './modules/product-stock/product-stock.module';
import { BusinessBranchPurchaseModule } from './modules/business-branch-purchase/business-branch-purchase.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    BusinessModule,
    ClientsModule,
    CollaboratorsModule,
    SuppliersModule,
    PendingsModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    ProductStockModule,
    BusinessBranchPurchaseModule,
    MetricsModule,
    SettingsModule,
    CurrenciesModule,
  ],
  providers: [],
})
export class AppModule {}
