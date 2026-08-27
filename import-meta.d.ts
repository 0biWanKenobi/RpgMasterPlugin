/// <reference types="node" />
/// <reference types="vite/client" />
import "obsidian"

interface ImportMetaEnv {
	readonly VITE_GAUTH_URL: string;
	readonly GAUTH_DESKTOP_CLIENT_ID?: string;
	readonly GAUTH_DESKTOP_CLIENT_SECRET?: string;
}


declare module "obsidian" {
	interface SecretStorage {
		deleteSecret(id: string): boolean;
	}

	interface App {
		dom: {
			appContainerEl: HTMLElement
		},
		appId: string
	}

	interface MenuItem {
		setSubmenu: () => Menu
	}
}

declare global {
	const RPG_MASTER_PLUGIN_VERSION: string;
}


