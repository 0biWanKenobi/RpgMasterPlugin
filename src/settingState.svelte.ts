import { CampaignSettings, DungeonMasterSettings, GDriveSettings } from "./settings/interfaces";

export const DEFAULT_SETTINGS: PluginSettings = {
	dungeonMaster: {
		id: '',
		name: '',
		lastUpdated: new Date(),
	},
	campaign: {
		list: [],
		rootFolder: undefined,
	},
	gdriveSettings: {
		configured: false,
		folderId: '',
		folderPath: '',
		expiresAt: undefined,
		lastUpdated: new Date(),
	},
	playerPeerId: '',
	lastUpdated: undefined,
	version: "1.0.0"
}

export interface PluginSettings {
	dungeonMaster: DungeonMasterSettings;
	campaign: {
		list: CampaignSettings[];
		rootFolder: string | undefined;
	}
	gdriveSettings: GDriveSettings;
	playerPeerId: string;
	lastUpdated?: Date;
	version: string;
}

export function createSettingsState(
    initial: PluginSettings,
): PluginSettings {
     const state = $state(initial);
    return state;
}

export function snapshotSettings(
    settings: PluginSettings,
): PluginSettings {
    return $state.snapshot(settings);
}