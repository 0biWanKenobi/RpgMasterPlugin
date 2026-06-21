import type { SecretStorage, ObsidianProtocolHandler } from "obsidian";
import { createContext } from "svelte";

type AppContextState = {
    secretStorage: SecretStorage
}

export interface IAppContext {
    state: AppContextState,
    registerProtocolHandler: (action: string, handler: ObsidianProtocolHandler) => void 
}

const [getAppContext, setAppContext] = createContext()