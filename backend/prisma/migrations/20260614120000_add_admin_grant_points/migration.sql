-- AlterTable: 积分流水增加管理员赠送原因
ALTER TABLE `point_ledgers` MODIFY `reason` ENUM('CHECK_IN', 'UNLOCK_LEVEL', 'ADMIN_GRANT') NOT NULL;
