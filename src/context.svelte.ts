import { createContext } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import type { PluginSettings } from "./settings.svelte";

const [getAppContext, setAppContext] = createContext<{
  plugin: RPGDungeonMasterPlugin,
  settings: PluginSettings  
    
}>()

export {
    getAppContext,
    setAppContext
}