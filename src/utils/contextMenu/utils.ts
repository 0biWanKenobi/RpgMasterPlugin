import { type TAbstractFile, TFolder } from "obsidian";
import type { CampaignSettings } from "../interfaces";

export function hasParentCampaign(settings: CampaignSettings, item: TAbstractFile): boolean {

    if(item instanceof TFolder) {
        if(settings.list.some( c => c.vaultPath == item.path)) return false;

        var parent = item.parent;
        var path = parent?.path
        while (path) {
            if(settings.list.some ( c => c.vaultPath == path)) return true;
            parent = parent?.parent ?? null
            path = parent?.path
        }
        return false;
    }

    else return !!item.parent && hasParentCampaign(settings, item.parent);

}