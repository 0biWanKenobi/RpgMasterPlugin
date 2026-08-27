//TODO: move code shared with player plugin to common package

import { SyncState } from "./driveSync/types";

export interface DungeonMasterSettings {
	id: string;
	name: string;
	image?: string;
	lastUpdated: Date;
}

export interface CampaignSettings {
	list: CampaignConfig[];
	rootFolder: string | undefined;
}

export interface CampaignConfig {
	id: string;
	/**
	 * Drive folder id
	 */
	syncId?: string,
	name: string;
	vaultPath: string,
	image?: string;
	masterId: string;
	playerCount: number;
	startDate: Date;
	endDate?: Date;
	lastUpdated: Date;
}

export interface GDriveSettings {
	configured: boolean;
	/**
	 * Drive root folder id
	 */
	folderId: string;
	/**
	 * Drive root folder path
	 */
	folderPath: string;
	expiresAt?: number;
	lastUpdated: Date;
}


export interface PluginSettings {
	vaultId?: string,
	dungeonMaster: DungeonMasterSettings;
	campaign: CampaignSettings
	gdriveSettings: GDriveSettings;
	playerPeerId: string;
	lastUpdated?: Date;
	version: string;
	syncState: SyncState;
}