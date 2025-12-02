-- AlterTable
ALTER TABLE `productbrand` ADD COLUMN `status` ENUM('activo', 'inactivo', 'revisar') NOT NULL DEFAULT 'activo';

-- AlterTable
ALTER TABLE `productcategory` ADD COLUMN `status` ENUM('activo', 'inactivo', 'revisar') NOT NULL DEFAULT 'activo';
