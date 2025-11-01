-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 192.168.0.94    Database: esp_tracker
-- ------------------------------------------------------
-- Server version	8.0.42

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
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `material_id` (`material_id`),
  KEY `idx_weighed_by` (`weighed_by`),
  KEY `idx_weighed_at` (`weighed_at`),
  CONSTRAINT `fk_batch_material_usage_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_material_usage_material` FOREIGN KEY (`material_id`) REFERENCES `material` (`id`),
  CONSTRAINT `fk_batch_material_usage_user` FOREIGN KEY (`weighed_by`) REFERENCES `users` (`id`)
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
  `fg_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `good_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `good_secondary_qty` decimal(10,2) DEFAULT NULL COMMENT 'ปริมาณผลผลิตดีในหน่วยที่สอง',
  `good_secondary_unit` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'หน่วยที่สองของผลผลิตดี',
  `defect_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_qty` decimal(10,2) GENERATED ALWAYS AS ((`good_qty` + `defect_qty`)) STORED,
  `recorded_by` int DEFAULT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_id` (`batch_id`),
  KEY `fg_code` (`fg_code`),
  KEY `idx_recorded_by` (`recorded_by`),
  KEY `idx_recorded_at` (`recorded_at`),
  CONSTRAINT `fk_batch_production_results_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_production_results_fg` FOREIGN KEY (`fg_code`) REFERENCES `fg` (`FG_Code`),
  CONSTRAINT `fk_batch_production_results_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
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
  PRIMARY KEY (`id`),
  KEY `idx_fg_code` (`FG_Code`)
) ENGINE=InnoDB AUTO_INCREMENT=913 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=909 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `finished_flags`
--

DROP TABLE IF EXISTS `finished_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finished_flags` (
  `work_plan_id` int NOT NULL,
  `is_finished` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`work_plan_id`),
  KEY `idx_finished_flags_work_plan_id` (`work_plan_id`),
  CONSTRAINT `finished_flags_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `batch_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `process_number` int DEFAULT NULL,
  `status` enum('start','stop') COLLATE utf8mb4_general_ci NOT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `work_plan_id` (`work_plan_id`),
  KEY `idx_logs_work_plan_id` (`work_plan_id`),
  CONSTRAINT `logs_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9056 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `machine_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ประเภทเครื่อง (NEC, iPad, FUJI, etc.)',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ตำแหน่งที่ตั้งเครื่อง',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT 'สถานะเครื่อง',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียดเพิ่มเติม',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `machine_code` (`machine_code`),
  KEY `idx_machine_code` (`machine_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลเครื่องบันทึกข้อมูลการผลิต';
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_catalog`
--

DROP TABLE IF EXISTS `menu_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_key` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `path` varchar(200) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `menu_group` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT 'system',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `menu_key` (`menu_key`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=975 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_batches`
--

DROP TABLE IF EXISTS `production_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_plan_id` int NOT NULL,
  `batch_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fg_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planned_qty` decimal(10,2) NOT NULL,
  `actual_qty` decimal(10,2) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('preparing','producing','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'preparing',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_plan_id` (`work_plan_id`),
  KEY `fg_code` (`fg_code`),
  KEY `idx_batch_code` (`batch_code`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`),
  CONSTRAINT `fk_production_batches_fg` FOREIGN KEY (`fg_code`) REFERENCES `fg` (`FG_Code`),
  CONSTRAINT `fk_production_batches_work_plan` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`)
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
  `job_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `production_date` date NOT NULL,
  `input_material_qty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `input_material_unit` varchar(32) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `output_unit_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `output_unit` varchar(32) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `output_qty` decimal(12,2) NOT NULL DEFAULT '0.00',
  `yield_percent` decimal(7,2) GENERATED ALWAYS AS ((case when (`input_material_qty` > 0) then ((`output_qty` / `input_material_qty`) * 100) else 0 end)) STORED,
  `time_used_minutes` int NOT NULL DEFAULT '0',
  `operators_count` int NOT NULL DEFAULT '0',
  `labor_rate_per_hour` decimal(10,2) NOT NULL DEFAULT '480.00',
  `labor_cost` decimal(12,2) GENERATED ALWAYS AS ((((`time_used_minutes` / 60) * `operators_count`) * `labor_rate_per_hour`)) STORED,
  `loss_percent` decimal(5,4) NOT NULL DEFAULT '0.1000',
  `loss_cost` decimal(12,2) GENERATED ALWAYS AS (((`output_qty` * `output_unit_cost`) * `loss_percent`)) STORED,
  `utility_percent` decimal(5,4) NOT NULL DEFAULT '0.0100',
  `utility_cost` decimal(12,2) GENERATED ALWAYS AS (((`output_qty` * `output_unit_cost`) * `utility_percent`)) STORED,
  `notes` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `material_details` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cost_by_job_date` (`production_date`,`job_code`),
  KEY `idx_cost_date` (`production_date`),
  KEY `idx_cost_work_plan` (`work_plan_id`),
  KEY `idx_batch_id` (`batch_id`),
  CONSTRAINT `fk_production_costs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=212 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
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
  `job_code` varchar(32) COLLATE utf8mb4_general_ci NOT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `production_date` date NOT NULL,
  `input_material_qty` decimal(18,3) DEFAULT '0.000',
  `input_material_unit` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'กก.',
  `total_weight_kg` decimal(18,3) DEFAULT '0.000',
  `material_cost` decimal(18,2) DEFAULT '0.00',
  `output_qty` decimal(18,3) DEFAULT '0.000',
  `output_unit` varchar(16) COLLATE utf8mb4_general_ci DEFAULT 'หน่วย',
  `output_unit_cost` decimal(18,2) DEFAULT '0.00',
  `time_used_minutes` int DEFAULT '0',
  `operators_count` int DEFAULT '0',
  `labor_rate_per_hour` decimal(18,2) DEFAULT '0.00',
  `planned_operators_count` int DEFAULT '0',
  `labor_workers_count` int DEFAULT '0',
  `labor_daily_wage` decimal(18,2) DEFAULT '0.00',
  `saved_by` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `saved_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wp_date` (`work_plan_id`,`production_date`),
  KEY `idx_cost_id` (`cost_id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `room_type` enum('hot_kitchen','cold_kitchen','prep_area','storage','other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ประเภทห้องผลิต',
  `capacity` int DEFAULT NULL COMMENT 'ความจุสูงสุด (จำนวนคน)',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ตำแหน่งที่ตั้งห้อง',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT 'สถานะห้อง',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'รายละเอียดเพิ่มเติม',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_code` (`room_code`),
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
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางสถานะการผลิต';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_configurations`
--

DROP TABLE IF EXISTS `role_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT 'blue',
  `url_prefix` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `menu_items` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
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
  `action` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `before_data` json DEFAULT NULL,
  `after_data` json DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_520_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `actor_user_id` (`actor_user_id`),
  KEY `idx_role_menu_audits_role_id` (`role_id`),
  KEY `idx_role_menu_audits_created_at` (`created_at`),
  KEY `idx_role_menu_audits_action` (`action`),
  CONSTRAINT `role_menu_audits_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role_configurations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_menu_audits_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
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
  `menu_key` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `can_view` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_menu` (`role_id`,`menu_key`),
  KEY `idx_role_menu_permissions_role_id` (`role_id`),
  KEY `idx_role_menu_permissions_menu_key` (`menu_key`),
  CONSTRAINT `role_menu_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role_configurations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_menu_permissions_ibfk_2` FOREIGN KEY (`menu_key`) REFERENCES `menu_catalog` (`menu_key`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `unit_conversions`
--

DROP TABLE IF EXISTS `unit_conversions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unit_conversions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_unit` varchar(16) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `to_unit` varchar(16) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `conversion_rate` decimal(10,4) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `material_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `material_pattern` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `Mat_Id` varchar(16) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_conversion` (`from_unit`,`to_unit`,`Mat_Id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_code` (`id_code`),
  KEY `idx_users_id_code` (`id_code`),
  KEY `idx_users_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
 1 AS `total_loss_cost`,
 1 AS `total_utility_cost`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `work_plan_drafts`
--

DROP TABLE IF EXISTS `work_plan_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plan_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL,
  `job_code` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `machine_id` int DEFAULT NULL,
  `production_room_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
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
  KEY `idx_work_plan_drafts_date_status` (`production_date`,`workflow_status_id`),
  KEY `idx_work_plan_drafts_job_code` (`job_code`),
  CONSTRAINT `work_plan_drafts_ibfk_1` FOREIGN KEY (`workflow_status_id`) REFERENCES `work_plan_workflow_statuses` (`id`),
  CONSTRAINT `work_plan_drafts_ibfk_2` FOREIGN KEY (`machine_id`) REFERENCES `machines` (`id`),
  CONSTRAINT `work_plan_drafts_ibfk_3` FOREIGN KEY (`production_room_id`) REFERENCES `production_rooms` (`id`),
  CONSTRAINT `work_plan_drafts_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `work_plan_drafts_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2450 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
 1 AS `status_code`,
 1 AS `status_name`,
 1 AS `color_code`,
 1 AS `machine_name`,
 1 AS `room_name`,
 1 AS `created_by_name`,
 1 AS `updated_by_name`*/;
SET character_set_client = @saved_cs_client;

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
  `id_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_plan_id` (`work_plan_id`),
  KEY `idx_work_plan_operators_work_plan_id` (`work_plan_id`),
  KEY `idx_work_plan_operators_user_id` (`user_id`),
  KEY `idx_work_plan_operators_id_code` (`id_code`),
  CONSTRAINT `work_plan_operators_ibfk_1` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1523 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_plan_workflow_statuses`
--

DROP TABLE IF EXISTS `work_plan_workflow_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plan_workflow_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status_description` text COLLATE utf8mb4_unicode_520_ci,
  `color_code` varchar(10) COLLATE utf8mb4_unicode_520_ci DEFAULT '#000000',
  `display_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_code` (`status_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_plans`
--

DROP TABLE IF EXISTS `work_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `production_date` date NOT NULL,
  `job_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `job_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status_id` int DEFAULT '1' COMMENT 'สถานะการผลิต',
  `is_special` tinyint(1) DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci COMMENT 'หมายเหตุ',
  `operators` json DEFAULT NULL COMMENT 'ข้อมูลผู้ปฏิบัติงานในรูปแบบ JSON',
  `machine_id` int DEFAULT NULL COMMENT 'รหัสเครื่องจักร',
  `production_room_id` int DEFAULT NULL COMMENT 'รหัสห้องผลิต',
  PRIMARY KEY (`id`),
  KEY `idx_work_plans_production_date` (`production_date`),
  KEY `idx_work_plans_status_id` (`status_id`),
  KEY `idx_work_plans_job_code` (`job_code`),
  KEY `idx_work_plans_date_status` (`production_date`,`status_id`),
  CONSTRAINT `fk_work_plans_status` FOREIGN KEY (`status_id`) REFERENCES `production_statuses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7290 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `synced_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`jitdhana`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_production_costs_summary` AS select `production_costs`.`production_date` AS `production_date`,count(0) AS `jobs_count`,sum(`production_costs`.`input_material_qty`) AS `total_input_qty`,sum(`production_costs`.`output_qty`) AS `total_output_qty`,avg(`production_costs`.`yield_percent`) AS `avg_yield_percent`,sum(`production_costs`.`labor_cost`) AS `total_labor_cost`,sum(`production_costs`.`loss_cost`) AS `total_loss_cost`,sum(`production_costs`.`utility_cost`) AS `total_utility_cost` from `production_costs` group by `production_costs`.`production_date` */;
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
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`jitdhana`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `work_plan_drafts_with_status` AS select `wpd`.`id` AS `id`,`wpd`.`production_date` AS `production_date`,`wpd`.`job_code` AS `job_code`,`wpd`.`job_name` AS `job_name`,`wpd`.`start_time` AS `start_time`,`wpd`.`end_time` AS `end_time`,`wpd`.`machine_id` AS `machine_id`,`wpd`.`production_room_id` AS `production_room_id`,`wpd`.`notes` AS `notes`,`wpd`.`workflow_status_id` AS `workflow_status_id`,`wpd`.`operators` AS `operators`,`wpd`.`created_by` AS `created_by`,`wpd`.`updated_by` AS `updated_by`,`wpd`.`created_at` AS `created_at`,`wpd`.`updated_at` AS `updated_at`,`wws`.`status_code` AS `status_code`,`wws`.`status_name` AS `status_name`,`wws`.`color_code` AS `color_code`,`m`.`machine_name` AS `machine_name`,`pr`.`room_name` AS `room_name`,`u1`.`name` AS `created_by_name`,`u2`.`name` AS `updated_by_name` from (((((`work_plan_drafts` `wpd` left join `work_plan_workflow_statuses` `wws` on((`wpd`.`workflow_status_id` = `wws`.`id`))) left join `machines` `m` on((`wpd`.`machine_id` = `m`.`id`))) left join `production_rooms` `pr` on((`wpd`.`production_room_id` = `pr`.`id`))) left join `users` `u1` on((`wpd`.`created_by` = `u1`.`id`))) left join `users` `u2` on((`wpd`.`updated_by` = `u2`.`id`))) where (`wws`.`is_active` = true) */;
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

-- Dump completed on 2025-09-25 14:30:57
