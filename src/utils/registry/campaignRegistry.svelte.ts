import { TFile } from "obsidian";
import RPGDungeonMasterPlugin from "../../rpgMasterPlugin";
import { MASTER_PLUGIN } from "../capability";
import { CampaignConfig } from "../interfaces";

export type CampaignRegistry = ReturnType<typeof CampaignRegistry>

export const CampaignRegistry = (_plugin: RPGDungeonMasterPlugin) => {

    const plugin = _plugin;
    const settings = plugin.getSettings(MASTER_PLUGIN);

    const campaignPathMap = $derived( new Map(settings.campaign.list.map( c => [c.vaultPath, c])))

    async function add(campaign: CampaignConfig) {
        settings.campaign.list.push(campaign);
        await plugin.saveSettings(MASTER_PLUGIN);
    }
    
    async function remove(campaignId: string){
        const idx = settings.campaign.list.findIndex(c => c.id == campaignId);
        if(idx<0) return;
        settings.campaign.list.splice(idx, 1);
        await plugin.saveSettings(MASTER_PLUGIN);
    }

    function findByVaultPath(campaignPath: string) {
        return campaignPathMap.get(campaignPath)
    }

    function findForFile(file: TFile){
        let parent = file.parent;

        while (parent) {
            const campaign = campaignPathMap.get(parent.path);

            if (campaign) 
                return campaign;
            
            parent = parent.parent;
        }

        return undefined;
    }

    return {
        add,
        remove,
        findByVaultPath,
        findForFile
    }
}