-- MySQL dump for manufacturing_system database structure
-- Host: 192.168.0.96    Database: manufacturing_system
-- ------------------------------------------------------
-- Generated on: 2025-10-10T04:01:49.847Z

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `batch_material_usage`
--

DROP TABLE IF EXISTS `batch_material_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_material_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `material_id` int NOT NULL,
  `planned_qty` decimal(10,2) NOT NULL,
  `actual_qty` decimal(10,2) NOT NULL,
  `unit` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_cost` decimal(12,2) GENERATED ALWAYS AS ((`actual_qty` * `unit_price`)) STORED,
  `weighed_by` int DEFAULT NULL,
  `weighed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_material_id` (`material_id`),
  KEY `idx_weighed_by` (`weighed_by`),
  KEY `idx_weighed_at` (`weighed_at`),
  CONSTRAINT `batch_material_usage_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_material_usage_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_material_usage_ibfk_3` FOREIGN KEY (`weighed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=506 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางการใช้วัตถุดิบจริงในล็อตการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `batch_production_results`
--

DROP TABLE IF EXISTS `batch_production_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_production_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `good_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `good_secondary_qty` decimal(10,2) DEFAULT NULL COMMENT 'ปริมาณผลผลิตดีในหน่วยที่สอง',
  `good_secondary_unit` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หน่วยที่สองของผลผลิตดี',
  `defect_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_qty` decimal(10,2) GENERATED ALWAYS AS ((`good_qty` + `defect_qty`)) STORED,
  `recorded_by` int DEFAULT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_batch_id` (`batch_id`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_recorded_by` (`recorded_by`),
  KEY `idx_recorded_at` (`recorded_at`),
  CONSTRAINT `batch_production_results_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_production_results_ibfk_2` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`) ON DELETE CASCADE,
  CONSTRAINT `batch_production_results_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผลผลิตจริงของล็อตการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fg`
--

DROP TABLE IF EXISTS `fg`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fg` (
  `id` int NOT NULL AUTO_INCREMENT,
  `FG_Code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FG_Name` varchar(127) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FG_Unit` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `FG_Size` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_unit` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT 'กก.' COMMENT 'หน่วยฐาน (เช่น กก.)',
  `conversion_rate` decimal(10,4) DEFAULT '1.0000' COMMENT 'อัตราส่วนแปลงจากหน่วยฐาน (เช่น 1 แพ็ค = 2 กก.)',
  `conversion_description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'คำอธิบายการแปลง (เช่น 1 แพ็ค = 2 กก.)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_fg_code` (`FG_Code`),
  KEY `idx_fg_code` (`FG_Code`),
  KEY `idx_fg_name` (`FG_Name`)
) ENGINE=InnoDB AUTO_INCREMENT=913 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสินค้าสำเร็จรูป (เก็บข้อมูลเดิม)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fg_bom`
--

DROP TABLE IF EXISTS `fg_bom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fg_bom` (
  `id` int NOT NULL AUTO_INCREMENT,
  `FG_Code` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Raw_Code` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Raw_Qty` float NOT NULL,
  `Raw_Unit` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fg_code` (`FG_Code`),
  KEY `idx_raw_code` (`Raw_Code`)
) ENGINE=InnoDB AUTO_INCREMENT=909 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสูตรการผลิต (เก็บข้อมูลเดิม)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finished_flags`
--

DROP TABLE IF EXISTS `finished_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finished_flags` (
  `work_plan_id` int NOT NULL,
  `is_finished` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`work_plan_id`),
  KEY `idx_finished_flags_work_plan_id` (`work_plan_id`),
  CONSTRAINT `finished_flags_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสถานะการเสร็จสิ้นงาน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `logs`
--

DROP TABLE IF EXISTS `logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_plan_id` int DEFAULT NULL,
  `batch_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_number` int DEFAULT NULL,
  `status` enum('start','stop') COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_plan_id` (`work_plan_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_status` (`status`),
  CONSTRAINT `logs_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9842 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางบันทึกการทำงาน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `machines`
--

DROP TABLE IF EXISTS `machines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสเครื่อง',
  `machine_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อเครื่อง',
  `machine_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ประเภทเครื่อง',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ตำแหน่งที่ตั้งเครื่อง',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT 'สถานะเครื่อง',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียดเพิ่มเติม',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_machine_code` (`machine_code`),
  KEY `idx_machine_code` (`machine_code`),
  KEY `idx_machine_type` (`machine_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลเครื่องจักร';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material`
--

DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Mat_Id` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Mat_Name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Mat_Unit` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_mat_id` (`Mat_Id`),
  KEY `idx_mat_id` (`Mat_Id`),
  KEY `idx_mat_name` (`Mat_Name`)
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางวัตถุดิบ (เก็บข้อมูลเดิม)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_material_code` (`material_code`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_material_name` (`material_name`)
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลวัตถุดิบ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_catalog`
--

DROP TABLE IF EXISTS `menu_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_group` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_menu_key` (`menu_key`),
  KEY `idx_menu_group` (`menu_group`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเมนูระบบ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_execution_operators`
--

DROP TABLE IF EXISTS `process_execution_operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_execution_operators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `execution_id` int NOT NULL COMMENT 'อ้างอิงการทำงาน',
  `user_id` int NOT NULL COMMENT 'รหัสพนักงาน',
  `role` enum('operator','supervisor','qa','helper') COLLATE utf8mb4_unicode_ci DEFAULT 'operator' COMMENT 'บทบาทในขั้นตอน',
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_execution_user` (`execution_id`,`user_id`),
  KEY `idx_execution` (`execution_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_role` (`role`),
  CONSTRAINT `process_execution_operators_ibfk_1` FOREIGN KEY (`execution_id`) REFERENCES `process_executions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `process_execution_operators_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผู้ปฏิบัติงานในแต่ละขั้นตอน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_executions`
--

DROP TABLE IF EXISTS `process_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_executions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_plan_id` int DEFAULT NULL COMMENT 'เชื่อมกับแผนการผลิต',
  `batch_id` int DEFAULT NULL COMMENT 'เชื่อมกับล็อตการผลิต',
  `template_id` int NOT NULL COMMENT 'อ้างอิงจาก process_templates',
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสสินค้า',
  `process_number` int NOT NULL COMMENT 'ลำดับขั้นตอนที่',
  `process_description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รายละเอียดขั้นตอน',
  `actual_worker_count` int DEFAULT NULL COMMENT 'จำนวนคนจริง',
  `start_time` datetime DEFAULT NULL COMMENT 'เวลาเริ่มต้น',
  `end_time` datetime DEFAULT NULL COMMENT 'เวลาสิ้นสุด',
  `duration_minutes` int GENERATED ALWAYS AS ((case when ((`start_time` is not null) and (`end_time` is not null)) then timestampdiff(MINUTE,`start_time`,`end_time`) else NULL end)) STORED COMMENT 'ระยะเวลาจริง (คำนวณอัตโนมัติ)',
  `status` enum('pending','in_progress','completed','skipped','paused') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'สถานะขั้นตอน',
  `machine_id` int DEFAULT NULL COMMENT 'เครื่องที่ใช้',
  `production_room_id` int DEFAULT NULL COMMENT 'ห้องที่ทำ',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'หมายเหตุ',
  `issues` text COLLATE utf8mb4_unicode_ci COMMENT 'ปัญหาที่พบ',
  `recorded_by` int DEFAULT NULL COMMENT 'บันทึกโดย (user_id)',
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `machine_id` (`machine_id`),
  KEY `production_room_id` (`production_room_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `idx_work_plan` (`work_plan_id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_product` (`product_code`),
  KEY `idx_template` (`template_id`),
  KEY `idx_status` (`status`),
  KEY `idx_recorded_at` (`recorded_at`),
  CONSTRAINT `process_executions_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `process_executions_ibfk_2` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `process_executions_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `process_templates` (`id`),
  CONSTRAINT `process_executions_ibfk_4` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`),
  CONSTRAINT `process_executions_ibfk_5` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `process_executions_ibfk_6` FOREIGN KEY (`production_room_id`) REFERENCES `production_rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `process_executions_ibfk_7` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางบันทึกการทำงานจริงของแต่ละขั้นตอน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_steps`
--

DROP TABLE IF EXISTS `process_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_code` varchar(20) NOT NULL,
  `job_name` varchar(100) NOT NULL,
  `date_recorded` date NOT NULL,
  `worker_count` int DEFAULT NULL,
  `process_number` int NOT NULL,
  `process_description` varchar(200) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_code` (`job_code`),
  KEY `idx_job_name` (`job_name`),
  KEY `idx_date_recorded` (`date_recorded`),
  KEY `idx_process_number` (`process_number`)
) ENGINE=InnoDB AUTO_INCREMENT=999 DEFAULT CHARSET=utf8mb3 COMMENT='ตารางขั้นตอนการผลิต (เก็บข้อมูลเดิม)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_template_history`
--

DROP TABLE IF EXISTS `process_template_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_template_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสสินค้า',
  `version` int NOT NULL COMMENT 'เวอร์ชัน',
  `change_type` enum('created','updated','deactivated','deleted') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ประเภทการเปลี่ยนแปลง',
  `changed_by` int DEFAULT NULL COMMENT 'ผู้แก้ไข (user_id)',
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `change_note` text COLLATE utf8mb4_unicode_ci COMMENT 'หมายเหตุการแก้ไข',
  `old_data` json DEFAULT NULL COMMENT 'ข้อมูลเดิม',
  `new_data` json DEFAULT NULL COMMENT 'ข้อมูลใหม่',
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_product` (`product_code`),
  KEY `idx_product_version` (`product_code`,`version`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `process_template_history_ibfk_1` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`) ON DELETE CASCADE,
  CONSTRAINT `process_template_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1999 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางประวัติการแก้ไขเทมเพลต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_templates`
--

DROP TABLE IF EXISTS `process_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสสินค้า',
  `version` int DEFAULT '1' COMMENT 'เวอร์ชันของเทมเพลต',
  `process_number` int NOT NULL COMMENT 'ลำดับขั้นตอนที่',
  `process_description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รายละเอียดขั้นตอน',
  `standard_worker_count` int DEFAULT NULL COMMENT 'จำนวนคนมาตรฐาน',
  `estimated_duration_minutes` int DEFAULT NULL COMMENT 'เวลาประมาณการ (นาที)',
  `required_machine_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ประเภทเครื่องที่ต้องใช้',
  `required_room_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ประเภทห้องที่ต้องการ',
  `required_skills` text COLLATE utf8mb4_unicode_ci COMMENT 'ทักษะที่ต้องการ',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'หมายเหตุ',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะการใช้งาน',
  `created_by` int DEFAULT NULL COMMENT 'สร้างโดย (user_id)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_version_step` (`product_code`,`version`,`process_number`),
  KEY `created_by` (`created_by`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_product_version` (`product_code`,`version`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `process_templates_ibfk_1` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`) ON DELETE CASCADE,
  CONSTRAINT `process_templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5034 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเทมเพลตขั้นตอนการผลิต (สูตร)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_active_versions`
--

DROP TABLE IF EXISTS `product_active_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_active_versions` (
  `product_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `active_version` int NOT NULL,
  `set_by` int DEFAULT NULL COMMENT 'users.id ผู้ตั้งค่า',
  `note` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `set_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_code`),
  KEY `idx_active_version` (`active_version`),
  KEY `idx_set_by` (`set_by`),
  CONSTRAINT `fav_product_fk` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`) ON DELETE CASCADE,
  CONSTRAINT `fav_user_fk` FOREIGN KEY (`set_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='สถานะเวอร์ชัน process_templates ที่ใช้งานอยู่สำหรับแต่ละสินค้า';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_bom`
--

DROP TABLE IF EXISTS `product_bom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_bom` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_material` (`product_code`,`material_code`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_material_code` (`material_code`),
  CONSTRAINT `product_bom_ibfk_1` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`) ON DELETE CASCADE,
  CONSTRAINT `product_bom_ibfk_2` FOREIGN KEY (`material_code`) REFERENCES `materials` (`material_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสูตรการผลิต (BOM)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_version_assignments`
--

DROP TABLE IF EXISTS `product_version_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_version_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_version` int NOT NULL,
  `assigned_by` int DEFAULT NULL COMMENT 'users.id ผู้เปลี่ยน',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pva_product` (`product_code`),
  KEY `idx_pva_version` (`assigned_version`),
  KEY `idx_pva_assigned_by` (`assigned_by`),
  KEY `idx_pva_assigned_at` (`assigned_at`),
  CONSTRAINT `pva_product_fk` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`) ON DELETE CASCADE,
  CONSTRAINT `pva_user_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ประวัติการกำหนดเวอร์ชันที่ใช้งานสำหรับสินค้า';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_batches`
--

DROP TABLE IF EXISTS `production_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_plan_id` int NOT NULL COMMENT 'เชื่อมกับแผนการผลิต',
  `batch_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสล็อต',
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสสินค้า',
  `planned_qty` decimal(10,2) NOT NULL COMMENT 'ปริมาณแผน',
  `actual_qty` decimal(10,2) DEFAULT NULL COMMENT 'ปริมาณจริง',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หน่วย',
  `start_time` datetime NOT NULL COMMENT 'เวลาเริ่ม',
  `end_time` datetime DEFAULT NULL COMMENT 'เวลาเสร็จ',
  `status` enum('preparing','producing','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'preparing' COMMENT 'สถานะล็อต',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_plan` (`work_plan_id`),
  KEY `idx_product` (`product_code`),
  KEY `idx_batch_code` (`batch_code`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`),
  CONSTRAINT `production_batches_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_batches_ibfk_2` FOREIGN KEY (`product_code`) REFERENCES `products` (`product_code`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางล็อตการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_costs`
--

DROP TABLE IF EXISTS `production_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_costs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_plan_id` bigint unsigned DEFAULT NULL,
  `batch_id` int DEFAULT NULL,
  `job_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `production_date` date NOT NULL,
  `input_material_qty` decimal(12,2) DEFAULT '0.00',
  `input_material_unit` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `output_unit_cost` decimal(12,2) DEFAULT '0.00',
  `output_unit` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `output_qty` decimal(12,2) DEFAULT '0.00',
  `yield_percent` decimal(7,2) GENERATED ALWAYS AS ((case when (`input_material_qty` > 0) then ((`output_qty` / `input_material_qty`) * 100) else 0 end)) STORED,
  `time_used_minutes` int DEFAULT '0',
  `operators_count` int DEFAULT '0',
  `labor_rate_per_hour` decimal(10,2) DEFAULT '480.00',
  `labor_cost` decimal(12,2) GENERATED ALWAYS AS ((((`time_used_minutes` / 60) * `operators_count`) * `labor_rate_per_hour`)) STORED,
  `material_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `material_details` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cost_by_job_date` (`production_date`,`job_code`),
  KEY `idx_cost_date` (`production_date`),
  KEY `idx_cost_work_plan` (`work_plan_id`),
  KEY `idx_batch_id` (`batch_id`),
  CONSTRAINT `production_costs_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางค่าใช้จ่ายการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_costs_history`
--

DROP TABLE IF EXISTS `production_costs_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_costs_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cost_id` int DEFAULT NULL COMMENT 'อ้างอิง production_costs.id ถ้ามี',
  `work_plan_id` int NOT NULL,
  `batch_id` int DEFAULT NULL,
  `job_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `production_date` date NOT NULL,
  `input_material_qty` decimal(18,3) DEFAULT '0.000',
  `input_material_unit` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT 'กก.',
  `total_weight_kg` decimal(18,3) DEFAULT '0.000',
  `material_cost` decimal(18,2) DEFAULT '0.00',
  `output_qty` decimal(18,3) DEFAULT '0.000',
  `output_unit` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT 'หน่วย',
  `output_unit_cost` decimal(18,2) DEFAULT '0.00',
  `time_used_minutes` int DEFAULT '0',
  `operators_count` int DEFAULT '0',
  `labor_rate_per_hour` decimal(18,2) DEFAULT '0.00',
  `planned_operators_count` int DEFAULT '0',
  `labor_workers_count` int DEFAULT '0',
  `labor_daily_wage` decimal(18,2) DEFAULT '0.00',
  `saved_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `saved_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `idx_wp_date` (`work_plan_id`,`production_date`),
  KEY `idx_cost_id` (`cost_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `production_costs_history_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_costs_history_ibfk_2` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางประวัติค่าใช้จ่ายการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_rooms`
--

DROP TABLE IF EXISTS `production_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสห้องผลิต',
  `room_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อห้องผลิต',
  `room_type` enum('hot_kitchen','cold_kitchen','prep_area','storage','packing','other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ประเภทห้องผลิต',
  `capacity` int DEFAULT NULL COMMENT 'ความจุสูงสุด (จำนวนคน)',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ตำแหน่งที่ตั้งห้อง',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT 'สถานะห้อง',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียดเพิ่มเติม',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_room_code` (`room_code`),
  KEY `idx_room_code` (`room_code`),
  KEY `idx_room_type` (`room_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลห้องผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_statuses`
--

DROP TABLE IF EXISTS `production_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อสถานะ',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'คำอธิบายสถานะ',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'สีของสถานะ (hex code)',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะการใช้งาน',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสถานะการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสสินค้า',
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อสินค้า',
  `product_type` enum('FG','Semi-FG','Component') COLLATE utf8mb4_unicode_ci DEFAULT 'FG' COMMENT 'ประเภทสินค้า',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หมวดหมู่',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียด',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หน่วย',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะการใช้งาน',
  `created_by` int DEFAULT NULL COMMENT 'สร้างโดย',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_code` (`product_code`),
  KEY `created_by` (`created_by`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_product_type` (`product_type`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลสินค้า';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products_backup_rename`
--

DROP TABLE IF EXISTS `products_backup_rename`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products_backup_rename` (
  `id` int NOT NULL DEFAULT '0',
  `product_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสสินค้า',
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อสินค้า',
  `product_type` enum('FG','Semi-FG','Component') COLLATE utf8mb4_unicode_ci DEFAULT 'FG' COMMENT 'ประเภทสินค้า',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หมวดหมู่',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียด',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หน่วย',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะการใช้งาน',
  `created_by` int DEFAULT NULL COMMENT 'สร้างโดย',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_configurations`
--

DROP TABLE IF EXISTS `role_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'blue',
  `url_prefix` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_items` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_name` (`role_name`),
  KEY `idx_display_name` (`display_name`),
  KEY `idx_url_prefix` (`url_prefix`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางการกำหนดค่าบทบาท';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_menu_audits`
--

DROP TABLE IF EXISTS `role_menu_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_menu_audits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_user_id` int DEFAULT NULL,
  `role_id` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `before_data` json DEFAULT NULL,
  `after_data` json DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actor_user_id` (`actor_user_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_action` (`action`),
  CONSTRAINT `role_menu_audits_ibfk_1` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `role_menu_audits_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `role_configurations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางตรวจสอบการเปลี่ยนแปลงเมนูบทบาท';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_menu_permissions`
--

DROP TABLE IF EXISTS `role_menu_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_menu_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `menu_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `can_view` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_menu` (`role_id`,`menu_key`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_menu_key` (`menu_key`),
  CONSTRAINT `role_menu_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role_configurations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_menu_permissions_ibfk_2` FOREIGN KEY (`menu_key`) REFERENCES `menu_catalog` (`menu_key`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสิทธิ์เมนูของบทบาท';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `unit_conversions`
--

DROP TABLE IF EXISTS `unit_conversions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unit_conversions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_unit` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_unit` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversion_rate` decimal(10,4) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_pattern` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_code` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_conversion` (`from_unit`,`to_unit`,`material_code`),
  KEY `idx_from_unit` (`from_unit`),
  KEY `idx_to_unit` (`to_unit`),
  KEY `idx_material_code` (`material_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางการแปลงหน่วย';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสพนักงาน',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ชื่อ-นามสกุล',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'อีเมล',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'เบอร์โทร',
  `position` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ตำแหน่ง',
  `department` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'แผนก',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะการทำงาน',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_id_code` (`id_code`),
  KEY `idx_name` (`name`),
  KEY `idx_department` (`department`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลพนักงาน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_plan_drafts`
--

DROP TABLE IF EXISTS `work_plan_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plan_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL,
  `job_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `machine_id` int DEFAULT NULL,
  `production_room_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `workflow_status_id` int NOT NULL DEFAULT '1',
  `operators` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_special` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `machine_id` (`machine_id`),
  KEY `production_room_id` (`production_room_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_job_code` (`job_code`),
  KEY `idx_workflow_status` (`workflow_status_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `work_plan_drafts_ibfk_1` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_plan_drafts_ibfk_2` FOREIGN KEY (`production_room_id`) REFERENCES `production_rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_plan_drafts_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_plan_drafts_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางร่างแผนการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_plan_operators`
--

DROP TABLE IF EXISTS `work_plan_operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plan_operators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_plan_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `id_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('operator','supervisor','qa','helper') COLLATE utf8mb4_unicode_ci DEFAULT 'operator',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_plan_operators_work_plan_id` (`work_plan_id`),
  KEY `idx_work_plan_operators_user_id` (`user_id`),
  KEY `idx_work_plan_operators_id_code` (`id_code`),
  CONSTRAINT `work_plan_operators_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_plan_operators_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1750 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผู้ปฏิบัติงานในแผนการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_plan_workflow_statuses`
--

DROP TABLE IF EXISTS `work_plan_workflow_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plan_workflow_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_description` text COLLATE utf8mb4_unicode_ci,
  `color_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '#000000',
  `display_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_status_code` (`status_code`),
  KEY `idx_status_name` (`status_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสถานะเวิร์กโฟลว์ของแผนการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_plans`
--

DROP TABLE IF EXISTS `work_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL COMMENT 'วันที่ผลิต',
  `job_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'รหัสงาน',
  `job_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ชื่องาน',
  `template_version` int DEFAULT NULL COMMENT 'เวอร์ชันเทมเพลตที่ใช้ตอนสร้างแผนงาน',
  `start_time` time DEFAULT NULL COMMENT 'เวลาเริ่มต้น',
  `end_time` time DEFAULT NULL COMMENT 'เวลาสิ้นสุด',
  `status_id` int DEFAULT '1' COMMENT 'สถานะการผลิต',
  `machine_id` int DEFAULT NULL COMMENT 'รหัสเครื่องจักร',
  `production_room_id` int DEFAULT NULL COMMENT 'รหัสห้องผลิต',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'หมายเหตุ',
  `is_special` tinyint(1) DEFAULT '0' COMMENT 'งานพิเศษ',
  `created_by` int DEFAULT NULL COMMENT 'สร้างโดย',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `machine_id` (`machine_id`),
  KEY `production_room_id` (`production_room_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_job_code` (`job_code`),
  KEY `idx_status` (`status_id`),
  KEY `idx_date_status` (`production_date`,`status_id`),
  CONSTRAINT `work_plans_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `production_statuses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_plans_ibfk_2` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_plans_ibfk_3` FOREIGN KEY (`production_room_id`) REFERENCES `production_rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `work_plans_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7415 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางแผนการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workplan_sync_log`
--

DROP TABLE IF EXISTS `workplan_sync_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workplan_sync_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_synced_at` (`synced_at`)
) ENGINE=InnoDB AUTO_INCREMENT=158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางบันทึกการซิงค์แผนการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_latest_process_templates`
--

DROP TABLE IF EXISTS `v_latest_process_templates`;
/*!50001 DROP VIEW IF EXISTS `v_latest_process_templates`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_latest_process_templates` AS SELECT 
 1 AS `id`,
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `product_type`,
 1 AS `category`,
 1 AS `version`,
 1 AS `process_number`,
 1 AS `process_description`,
 1 AS `standard_worker_count`,
 1 AS `estimated_duration_minutes`,
 1 AS `required_machine_type`,
 1 AS `required_room_type`,
 1 AS `required_skills`,
 1 AS `notes`,
 1 AS `is_active`,
 1 AS `created_by`,
 1 AS `created_by_name`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_process_execution_summary`
--

DROP TABLE IF EXISTS `v_process_execution_summary`;
/*!50001 DROP VIEW IF EXISTS `v_process_execution_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_process_execution_summary` AS SELECT 
 1 AS `execution_id`,
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `product_type`,
 1 AS `process_number`,
 1 AS `process_description`,
 1 AS `status`,
 1 AS `start_time`,
 1 AS `end_time`,
 1 AS `duration_minutes`,
 1 AS `actual_worker_count`,
 1 AS `standard_worker_count`,
 1 AS `estimated_duration_minutes`,
 1 AS `efficiency_percent`,
 1 AS `time_status`,
 1 AS `operators`,
 1 AS `operator_count`,
 1 AS `machine_name`,
 1 AS `machine_code`,
 1 AS `room_name`,
 1 AS `room_code`,
 1 AS `production_date`,
 1 AS `work_plan_id`,
 1 AS `batch_code`,
 1 AS `notes`,
 1 AS `issues`,
 1 AS `recorded_by_name`,
 1 AS `recorded_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_product_active_versions`
--

DROP TABLE IF EXISTS `v_product_active_versions`;
/*!50001 DROP VIEW IF EXISTS `v_product_active_versions`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_product_active_versions` AS SELECT 
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `active_version`,
 1 AS `set_by`,
 1 AS `set_by_name`,
 1 AS `note`,
 1 AS `set_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_product_process_statistics`
--

DROP TABLE IF EXISTS `v_product_process_statistics`;
/*!50001 DROP VIEW IF EXISTS `v_product_process_statistics`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_product_process_statistics` AS SELECT 
 1 AS `product_code`,
 1 AS `product_name`,
 1 AS `product_type`,
 1 AS `category`,
 1 AS `total_process_steps`,
 1 AS `latest_version`,
 1 AS `total_estimated_minutes`,
 1 AS `total_standard_workers`,
 1 AS `total_executions`,
 1 AS `avg_actual_duration`,
 1 AS `first_execution_date`,
 1 AS `last_execution_date`,
 1 AS `completed_count`,
 1 AS `in_progress_count`,
 1 AS `pending_count`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_production_costs_summary`
--

DROP TABLE IF EXISTS `v_production_costs_summary`;
/*!50001 DROP VIEW IF EXISTS `v_production_costs_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_production_costs_summary` AS SELECT 
 1 AS `production_date`,
 1 AS `jobs_count`,
 1 AS `total_input_qty`,
 1 AS `total_output_qty`,
 1 AS `avg_yield_percent`,
 1 AS `total_labor_cost`,
 1 AS `total_material_cost`,
 1 AS `total_cost`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `work_plan_drafts_with_status`
--

DROP TABLE IF EXISTS `work_plan_drafts_with_status`;
/*!50001 DROP VIEW IF EXISTS `work_plan_drafts_with_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `work_plan_drafts_with_status` AS SELECT 
 1 AS `id`,
 1 AS `production_date`,
 1 AS `job_code`,
 1 AS `job_name`,
 1 AS `start_time`,
 1 AS `end_time`,
 1 AS `machine_id`,
 1 AS `production_room_id`,
 1 AS `notes`,
 1 AS `workflow_status_id`,
 1 AS `operators`,
 1 AS `created_by`,
 1 AS `updated_by`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `is_special`,
 1 AS `status_code`,
 1 AS `status_name`,
 1 AS `color_code`,
 1 AS `machine_name`,
 1 AS `room_name`,
 1 AS `created_by_name`,
 1 AS `updated_by_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_latest_process_templates`
--

/*!50001 DROP VIEW IF EXISTS `v_latest_process_templates`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
CREATE ALGORITHM=UNDEFINED DEFINER=`jitdhana`@`%` SQL SECURITY DEFINER VIEW `v_latest_process_templates` AS select `pt`.`id` AS `id`,`pt`.`product_code` AS `product_code`,`p`.`product_name` AS `product_name`,`p`.`product_type` AS `product_type`,`p`.`category` AS `category`,`pt`.`version` AS `version`,`pt`.`process_number` AS `process_number`,`pt`.`process_description` AS `process_description`,`pt`.`standard_worker_count` AS `standard_worker_count`,`pt`.`estimated_duration_minutes` AS `estimated_duration_minutes`,`pt`.`required_machine_type` AS `required_machine_type`,`pt`.`required_room_type` AS `required_room_type`,`pt`.`required_skills` AS `required_skills`,`pt`.`notes` AS `notes`,`pt`.`is_active` AS `is_active`,`pt`.`created_by` AS `created_by`,`u`.`name` AS `created_by_name`,`pt`.`created_at` AS `created_at`,`pt`.`updated_at` AS `updated_at` from ((`process_templates` `pt` join `products` `p` on((`pt`.`product_code` = `p`.`product_code`))) left join `users` `u` on((`pt`.`created_by` = `u`.`id`))) where ((`pt`.`is_active` = true) and (`pt`.`version` = (select max(`pt2`.`version`) from `process_templates` `pt2` where ((`pt2`.`product_code` = `pt`.`product_code`) and (`pt2`.`is_active` = true))))) order by `pt`.`product_code`,`pt`.`process_number`;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_process_execution_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_process_execution_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
CREATE ALGORITHM=UNDEFINED DEFINER=`jitdhana`@`%` SQL SECURITY DEFINER VIEW `v_process_execution_summary` AS select `pe`.`id` AS `execution_id`,`pe`.`product_code` AS `product_code`,`p`.`product_name` AS `product_name`,`p`.`product_type` AS `product_type`,`pe`.`process_number` AS `process_number`,`pe`.`process_description` AS `process_description`,`pe`.`status` AS `status`,`pe`.`start_time` AS `start_time`,`pe`.`end_time` AS `end_time`,`pe`.`duration_minutes` AS `duration_minutes`,`pe`.`actual_worker_count` AS `actual_worker_count`,`pt`.`standard_worker_count` AS `standard_worker_count`,`pt`.`estimated_duration_minutes` AS `estimated_duration_minutes`,(case when ((`pt`.`estimated_duration_minutes` > 0) and (`pe`.`duration_minutes` > 0)) then round(((`pt`.`estimated_duration_minutes` / `pe`.`duration_minutes`) * 100),2) else NULL end) AS `efficiency_percent`,(case when (`pe`.`duration_minutes` is null) then 'N/A' when (`pe`.`duration_minutes` <= `pt`.`estimated_duration_minutes`) then 'On Time' when (`pe`.`duration_minutes` > `pt`.`estimated_duration_minutes`) then 'Delayed' else 'N/A' end) AS `time_status`,group_concat(distinct `u`.`name` order by `u`.`name` ASC separator ', ') AS `operators`,count(distinct `peo`.`user_id`) AS `operator_count`,`m`.`machine_name` AS `machine_name`,`m`.`machine_code` AS `machine_code`,`pr`.`room_name` AS `room_name`,`pr`.`room_code` AS `room_code`,`wp`.`production_date` AS `production_date`,`wp`.`id` AS `work_plan_id`,`b`.`batch_code` AS `batch_code`,`pe`.`notes` AS `notes`,`pe`.`issues` AS `issues`,`rec_user`.`name` AS `recorded_by_name`,`pe`.`recorded_at` AS `recorded_at` from (((((((((`process_executions` `pe` join `products` `p` on((`pe`.`product_code` = `p`.`product_code`))) join `process_templates` `pt` on((`pe`.`template_id` = `pt`.`id`))) left join `work_plans` `wp` on((`pe`.`work_plan_id` = `wp`.`id`))) left join `production_batches` `b` on((`pe`.`batch_id` = `b`.`id`))) left join `machines` `m` on((`pe`.`machine_id` = `m`.`id`))) left join `production_rooms` `pr` on((`pe`.`production_room_id` = `pr`.`id`))) left join `process_execution_operators` `peo` on((`pe`.`id` = `peo`.`execution_id`))) left join `users` `u` on((`peo`.`user_id` = `u`.`id`))) left join `users` `rec_user` on((`pe`.`recorded_by` = `rec_user`.`id`))) group by `pe`.`id` order by `pe`.`recorded_at` desc,`pe`.`product_code`,`pe`.`process_number`;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_product_active_versions`
--

/*!50001 DROP VIEW IF EXISTS `v_product_active_versions`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
CREATE ALGORITHM=UNDEFINED DEFINER=`jitdhana`@`192.168.0.139` SQL SECURITY DEFINER VIEW `v_product_active_versions` AS select `p`.`product_code` AS `product_code`,`p`.`product_name` AS `product_name`,`av`.`active_version` AS `active_version`,`av`.`set_by` AS `set_by`,`u`.`name` AS `set_by_name`,`av`.`note` AS `note`,`av`.`set_at` AS `set_at` from ((`products` `p` left join `product_active_versions` `av` on((`av`.`product_code` = `p`.`product_code`))) left join `users` `u` on((`u`.`id` = `av`.`set_by`))) where (`p`.`is_active` = 1);
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_product_process_statistics`
--

/*!50001 DROP VIEW IF EXISTS `v_product_process_statistics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
CREATE ALGORITHM=UNDEFINED DEFINER=`jitdhana`@`%` SQL SECURITY DEFINER VIEW `v_product_process_statistics` AS select `p`.`product_code` AS `product_code`,`p`.`product_name` AS `product_name`,`p`.`product_type` AS `product_type`,`p`.`category` AS `category`,count(distinct `pt`.`id`) AS `total_process_steps`,max(`pt`.`version`) AS `latest_version`,sum(`pt`.`estimated_duration_minutes`) AS `total_estimated_minutes`,sum(`pt`.`standard_worker_count`) AS `total_standard_workers`,count(distinct `pe`.`id`) AS `total_executions`,avg(`pe`.`duration_minutes`) AS `avg_actual_duration`,min(`pe`.`recorded_at`) AS `first_execution_date`,max(`pe`.`recorded_at`) AS `last_execution_date`,sum((case when (`pe`.`status` = 'completed') then 1 else 0 end)) AS `completed_count`,sum((case when (`pe`.`status` = 'in_progress') then 1 else 0 end)) AS `in_progress_count`,sum((case when (`pe`.`status` = 'pending') then 1 else 0 end)) AS `pending_count` from ((`products` `p` left join `process_templates` `pt` on(((`p`.`product_code` = `pt`.`product_code`) and (`pt`.`is_active` = true)))) left join `process_executions` `pe` on((`p`.`product_code` = `pe`.`product_code`))) where (`p`.`is_active` = true) group by `p`.`product_code`,`p`.`product_name`,`p`.`product_type`,`p`.`category` order by `p`.`product_code`;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_production_costs_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_production_costs_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
CREATE ALGORITHM=UNDEFINED DEFINER=`jitdhana`@`192.168.0.139` SQL SECURITY DEFINER VIEW `v_production_costs_summary` AS select `production_costs`.`production_date` AS `production_date`,count(0) AS `jobs_count`,sum(`production_costs`.`input_material_qty`) AS `total_input_qty`,sum(`production_costs`.`output_qty`) AS `total_output_qty`,avg(`production_costs`.`yield_percent`) AS `avg_yield_percent`,sum(`production_costs`.`labor_cost`) AS `total_labor_cost`,sum(`production_costs`.`material_cost`) AS `total_material_cost`,sum(`production_costs`.`total_cost`) AS `total_cost` from `production_costs` group by `production_costs`.`production_date`;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `work_plan_drafts_with_status`
--

/*!50001 DROP VIEW IF EXISTS `work_plan_drafts_with_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
CREATE ALGORITHM=UNDEFINED DEFINER=`jitdhana`@`192.168.0.139` SQL SECURITY DEFINER VIEW `work_plan_drafts_with_status` AS select `wpd`.`id` AS `id`,`wpd`.`production_date` AS `production_date`,`wpd`.`job_code` AS `job_code`,`wpd`.`job_name` AS `job_name`,`wpd`.`start_time` AS `start_time`,`wpd`.`end_time` AS `end_time`,`wpd`.`machine_id` AS `machine_id`,`wpd`.`production_room_id` AS `production_room_id`,`wpd`.`notes` AS `notes`,`wpd`.`workflow_status_id` AS `workflow_status_id`,`wpd`.`operators` AS `operators`,`wpd`.`created_by` AS `created_by`,`wpd`.`updated_by` AS `updated_by`,`wpd`.`created_at` AS `created_at`,`wpd`.`updated_at` AS `updated_at`,`wpd`.`is_special` AS `is_special`,`wws`.`status_code` AS `status_code`,`wws`.`status_name` AS `status_name`,`wws`.`color_code` AS `color_code`,`m`.`machine_name` AS `machine_name`,`pr`.`room_name` AS `room_name`,`u1`.`name` AS `created_by_name`,`u2`.`name` AS `updated_by_name` from (((((`work_plan_drafts` `wpd` left join `work_plan_workflow_statuses` `wws` on((`wpd`.`workflow_status_id` = `wws`.`id`))) left join `machines` `m` on((`wpd`.`machine_id` = `m`.`id`))) left join `production_rooms` `pr` on((`wpd`.`production_room_id` = `pr`.`id`))) left join `users` `u1` on((`wpd`.`created_by` = `u1`.`id`))) left join `users` `u2` on((`wpd`.`updated_by` = `u2`.`id`))) where (`wws`.`is_active` = true);
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-10 04:01:49
