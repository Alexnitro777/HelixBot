CREATE TABLE `guild_modules` (
	`guild_id` varchar(64) NOT NULL,
	`module_id` varchar(64) NOT NULL,
	`enabled` boolean DEFAULT false,
	`settings` json,
	CONSTRAINT `guild_modules_guild_id_module_id_pk` PRIMARY KEY(`guild_id`,`module_id`)
);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` varchar(64) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `guilds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `guild_modules` ADD CONSTRAINT `guild_modules_guild_id_guilds_id_fk` FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE cascade ON UPDATE no action;