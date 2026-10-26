CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`company` text NOT NULL,
	`chapter` text NOT NULL,
	`sector` text NOT NULL,
	`description` text NOT NULL,
	`audience` text NOT NULL,
	`contact` text NOT NULL,
	`position` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`website` text NOT NULL,
	`logo` text NOT NULL,
	`booths` text NOT NULL,
	`meetings` text NOT NULL,
	`notes` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_token_unique` ON `applications` (`token`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mail_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`kind` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text NOT NULL,
	`error` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`booth_id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
