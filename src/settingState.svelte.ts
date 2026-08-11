import { PluginSettings } from "./utils/interfaces";

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
	version: "1.0.0",
	syncState: {
		documents: {},
	},
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