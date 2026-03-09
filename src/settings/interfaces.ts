//TODO: move code shared with player plugin to common package

export interface DungeonMasterSettings {
	id: string;
	name: string;
	image?: string;
	campaigns: string[];
	lastUpdated: Date;
}

export interface CharacterSettings {
	id: string;
	campaignId: string;
	name: string;
	playerName: string;
	image?: string;
	level: number;
	class: string;
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
