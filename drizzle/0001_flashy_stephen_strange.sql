CREATE TABLE `sunzi_event_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`eventVersionId` int NOT NULL,
	`situationSummary` text NOT NULL,
	`objective` text NOT NULL,
	`unknownsJson` text NOT NULL,
	`interestsJson` text NOT NULL,
	`risksJson` text NOT NULL,
	`caution` text NOT NULL,
	`model` varchar(80) NOT NULL,
	`promptVersion` varchar(32) NOT NULL,
	`sourceOldid` varchar(32) NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `sunzi_event_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sunzi_event_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`rank` int NOT NULL,
	`chapterNumber` int NOT NULL,
	`segmentId` varchar(8) NOT NULL,
	`principle` varchar(120) NOT NULL,
	`quote` text NOT NULL,
	`reason` text NOT NULL,
	`application` text NOT NULL,
	`limits` text NOT NULL,
	`confidence` enum('high','medium','low') NOT NULL,
	`missingInfo` text NOT NULL,
	CONSTRAINT `sunzi_event_matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `sunzi_event_matches_analysis_rank_idx` UNIQUE(`analysisId`,`rank`)
);
--> statement-breakpoint
CREATE TABLE `sunzi_event_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`actionTaken` text NOT NULL,
	`outcome` text NOT NULL,
	`reflection` text NOT NULL,
	`recordedAt` bigint NOT NULL,
	CONSTRAINT `sunzi_event_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sunzi_event_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`version` int NOT NULL,
	`facts` text NOT NULL,
	`goal` text NOT NULL,
	`stakeholders` text NOT NULL,
	`resources` text NOT NULL,
	`constraints` text NOT NULL,
	`knownRisks` text NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `sunzi_event_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sunzi_event_versions_event_version_idx` UNIQUE(`eventId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `sunzi_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`stage` enum('proposed','active','pending','completed') NOT NULL DEFAULT 'proposed',
	`sensitivity` enum('normal','confidential','highly_confidential') NOT NULL DEFAULT 'confidential',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `sunzi_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sunzi_event_analyses_event_idx` ON `sunzi_event_analyses` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sunzi_event_analyses_version_idx` ON `sunzi_event_analyses` (`eventVersionId`);--> statement-breakpoint
CREATE INDEX `sunzi_event_matches_segment_idx` ON `sunzi_event_matches` (`segmentId`);--> statement-breakpoint
CREATE INDEX `sunzi_event_outcomes_event_idx` ON `sunzi_event_outcomes` (`eventId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `sunzi_event_versions_event_idx` ON `sunzi_event_versions` (`eventId`);--> statement-breakpoint
CREATE INDEX `sunzi_events_user_updated_idx` ON `sunzi_events` (`userId`,`updatedAt`);