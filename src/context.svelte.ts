import { createContext } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterMain";
import { PluginSettings } from "./settingState.svelte";

const [getAppContext, setAppContext] = createContext<{
  plugin: RPGDungeonMasterPlugin,
  settings: PluginSettings  
    
}>()

export {
    getAppContext,
    setAppContext
}