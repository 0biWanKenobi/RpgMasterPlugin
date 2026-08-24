<script lang="ts">
	import { HeaderWithIcon } from "rpg_shared/ui/custom";
    import { Modal } from "rpg_shared/ui/obsidian"
	import { Button } from "rpg_shared/ui/base";
	import { getAppContext } from "../../context.svelte";
	import CampaignItem from "./CampaignItem.svelte";
	import VaultFolderPicker from "./VaultFolderPicker.svelte";
	import { MASTER_PLUGIN } from "../../utils/capability";
    
    const{ settings, plugin } = getAppContext();
    const campaignList = $derived(settings.campaign.list)

    let deleteCampaignState = $state({
        modal: false,
        id: '',
        index: 0
    })

    const onDeleteCampaign = async() => {
        campaignList.splice(deleteCampaignState.index, 1);
        await plugin.saveSettings(MASTER_PLUGIN);
        deleteCampaignState.modal = false
    }
</script>

<HeaderWithIcon text='Campaigns' icon='scroll-text'></HeaderWithIcon>
<VaultFolderPicker/>

<div class="plugin-settings-campaigns-gallery">
    {#each campaignList as campaignItem, i (campaignItem.id) }
        <CampaignItem
            id={campaignItem.id}
            name={campaignItem.name}
            image={campaignItem.image}
            index={i}
            onDeleteRequest={(id, index) => {
                deleteCampaignState.id = id;
                deleteCampaignState.index = index;
                deleteCampaignState.modal = true;
            }}
        />
    {/each}
</div>

<Modal
    bind:open={deleteCampaignState.modal}
    title="Remove Campaign?"
>
    <div class="confirm-modal-buttons">
        <Button warning onClick={onDeleteCampaign}>Yes</Button>
        <Button onClick={() => {deleteCampaignState.modal = false}}>No</Button>
    </div>
</Modal>

<style>
    .plugin-settings-campaigns-gallery :global {
        display: flex;
        flex-direction: row;
        gap: 1em;
        margin-bottom: 20px;
        .plugin-settings-campaign-gallery-item {
            width: 100px;
            height: 100px;
            border: 1px solid var(--border-color);
            border-radius: 5px;
            padding: 10px;
            word-break: break-word;
            position: relative;
            .item-icon {
                position: absolute;
                top: 10px;
                right: 10px;
                cursor: pointer;
                display: none;
            }
            :hover{
                .item-icon {
                    display: flex;
                }
            }

            .plugin-settings-campaign-gallery-item-name {
                overflow: hidden;
                height: 100%;
                -webkit-line-clamp: 4;
                line-clamp: 4;
                -webkit-box-orient: vertical;
                display: -webkit-box;
            }
        }
    }

    .confirm-modal-buttons {
        display: flex;
        column-gap: 5px;
        justify-content: end;
    }
</style>


