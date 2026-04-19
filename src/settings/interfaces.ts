//TODO: move code shared with player plugin to common package

export interface DungeonMasterSettings {
	id: string;
	name: string;
	image?: string;
	lastUpdated: Date;
}

export interface CampaignSettings {
	id: string;
	name: string;
	image?: string;
	masterId: string;
	playerCount: number;
	startDate: Date;
	endDate?: Date;
	lastUpdated: Date;
}

export interface GDriveSettings {
	configured: boolean;
	tokenType: string;
	scope: string;
	folderId: string;
	expiresAt?: number;
	lastUpdated: Date;
}
