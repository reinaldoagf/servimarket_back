-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Role_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('vista', 'actualizar', 'eliminar') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePage` (
    `id` VARCHAR(191) NOT NULL,
    `page` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NULL,
    `dniFile` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    `hasAllPermissions` BOOLEAN NOT NULL DEFAULT false,
    `roleId` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'venezuela',
    `state` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_dni_key`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductBrand` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `flavor` VARCHAR(191) NULL,
    `smell` VARCHAR(191) NULL,
    `measurement` INTEGER NULL,
    `unitMeasurement` ENUM('gramos', 'litros') NULL DEFAULT 'gramos',
    `priceCalculation` ENUM('unidad', 'unidadDeMedida') NULL DEFAULT 'unidad',
    `packing` ENUM('botella', 'bolsa', 'caja', 'paquete', 'envase', 'otro') NOT NULL DEFAULT 'bolsa',
    `status` ENUM('activo', 'inactivo', 'revisar') NOT NULL DEFAULT 'activo',
    `categoryId` VARCHAR(191) NULL,
    `brandId` VARCHAR(191) NULL,
    `businessRef` VARCHAR(191) NULL,
    `businessId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Product_name_flavor_smell_measurement_key`(`name`, `flavor`, `smell`, `measurement`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductTag` (
    `id` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductStock` (
    `id` VARCHAR(191) NOT NULL,
    `availables` DOUBLE NOT NULL DEFAULT 0.0,
    `salePrice` DOUBLE NOT NULL DEFAULT 0.0,
    `purchasePrice` DOUBLE NOT NULL DEFAULT 0.0,
    `profitPercentage` DOUBLE NOT NULL DEFAULT 0.0,
    `returnOnInvestment` DOUBLE NOT NULL DEFAULT 0.0,
    `productId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductStock_productId_branchId_key`(`productId`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pending` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `eventDate` DATETIME(3) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `linkedUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `quantityProducts` INTEGER NULL,
    `quantityBranches` INTEGER NULL,
    `proFunctions` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Business` (
    `id` VARCHAR(191) NOT NULL,
    `rif` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `subscriptionPlanId` VARCHAR(191) NULL,
    `subscriptionDate` DATETIME(3) NOT NULL,
    `expirationDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Business_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessBranch` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'venezuela',
    `state` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `currencyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashRegister` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessBranchCollaborator` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `cashRegisterId` VARCHAR(191) NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BusinessBranchCollaborator_cashRegisterId_key`(`cashRegisterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessBranchClient` (
    `id` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NULL,
    `clientDNI` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessBranchSupplier` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `businessBranchPurchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productStockRef` VARCHAR(191) NULL,
    `productStockId` VARCHAR(191) NOT NULL,
    `unitsOrMeasures` DOUBLE NOT NULL DEFAULT 1.0,
    `price` DOUBLE NOT NULL DEFAULT 0.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessBranchPurchase` (
    `id` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NULL,
    `clientDNI` VARCHAR(191) NULL,
    `businessRef` VARCHAR(191) NULL,
    `registeredRef` VARCHAR(191) NULL,
    `cashRegisterRef` VARCHAR(191) NULL,
    `branchRef` VARCHAR(191) NULL,
    `cashRegisterId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `amountCancelled` DOUBLE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `expiredDate` DATETIME(3) NULL,
    `closingDate` DATETIME(3) NULL,
    `status` ENUM('pendiente', 'pagado', 'caducado') NOT NULL DEFAULT 'pendiente',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'venezuela',
    `floatValue` DOUBLE NULL,
    `stringValue` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `businessId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Setting_key_userId_businessId_branchId_key`(`key`, `userId`, `businessId`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Currency` (
    `id` VARCHAR(191) NOT NULL,
    `coin` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `exchange` DOUBLE NOT NULL DEFAULT 1.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Currency_coin_key`(`coin`),
    UNIQUE INDEX `Currency_code_key`(`code`),
    UNIQUE INDEX `Currency_symbol_key`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePage` ADD CONSTRAINT `RolePage_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ProductCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `ProductBrand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTag` ADD CONSTRAINT `ProductTag_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductStock` ADD CONSTRAINT `ProductStock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductStock` ADD CONSTRAINT `ProductStock_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pending` ADD CONSTRAINT `Pending_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pending` ADD CONSTRAINT `Pending_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pending` ADD CONSTRAINT `Pending_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pending` ADD CONSTRAINT `Pending_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Business` ADD CONSTRAINT `Business_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Business` ADD CONSTRAINT `Business_subscriptionPlanId_fkey` FOREIGN KEY (`subscriptionPlanId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranch` ADD CONSTRAINT `BusinessBranch_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranch` ADD CONSTRAINT `BusinessBranch_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `Currency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashRegister` ADD CONSTRAINT `CashRegister_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashRegister` ADD CONSTRAINT `CashRegister_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchCollaborator` ADD CONSTRAINT `BusinessBranchCollaborator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchCollaborator` ADD CONSTRAINT `BusinessBranchCollaborator_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchCollaborator` ADD CONSTRAINT `BusinessBranchCollaborator_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `CashRegister`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchClient` ADD CONSTRAINT `BusinessBranchClient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchClient` ADD CONSTRAINT `BusinessBranchClient_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchSupplier` ADD CONSTRAINT `BusinessBranchSupplier_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchSupplier` ADD CONSTRAINT `BusinessBranchSupplier_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_businessBranchPurchaseId_fkey` FOREIGN KEY (`businessBranchPurchaseId`) REFERENCES `BusinessBranchPurchase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_productStockId_fkey` FOREIGN KEY (`productStockId`) REFERENCES `ProductStock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchPurchase` ADD CONSTRAINT `BusinessBranchPurchase_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `CashRegister`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessBranchPurchase` ADD CONSTRAINT `BusinessBranchPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `BusinessBranch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
