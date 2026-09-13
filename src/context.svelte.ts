import { createContext } from "svelte";
import type RPGDungeonMasterPlugin from "./rpgMasterPlugin";
import type { PluginSettings } from "./utils/interfaces";

const [getAppContext, setAppContext] = createContext<{
  plugin: RPGDungeonMasterPlugin,
  settings: PluginSettings
}>()

export {
    getAppContext,
    setAppContext
}