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
}