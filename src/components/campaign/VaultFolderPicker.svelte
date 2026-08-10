<script lang="ts">
	import { SettingItem } from "rpg_shared/ui/obsidian";
    import { getAppContext } from "../../context.svelte";
    import FolderPicker from "../localSelectors/FolderPicker.svelte";
	import { MASTER_PLUGIN } from "../../capability";

    const{settings, plugin} = getAppContext();
</script>


<SettingItem name="Vault Location" description="The location of the vault where the campaigns are stored.">
    <FolderPicker 
      value={settings.campaign.rootFolder}
        onSelected={async (v) => {
            settings.campaign.rootFolder = v?.path;
            await plugin.saveSettings(MASTER_PLUGIN);
        }}
       app={plugin.app}
    />
</SettingItem>