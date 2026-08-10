<script lang="ts">
	import { sc_randUUID } from "rpg_shared/crypto";
	import { Notice } from "obsidian";
	import { HeaderWithIcon } from "rpg_shared/ui/custom";
    import { SettingItem as Setting, Modal, SettingItemGroup } from "rpg_shared/ui/obsidian"
	import { Button, Input } from "rpg_shared/ui/base";
	import { getAppContext } from "../../context.svelte";
	import CampaignItem from "./CampaignItem.svelte";
	import VaultFolderPicker from "./VaultFolderPicker.svelte";
	import { MASTER_PLUGIN } from "../../capability";
    
    type CampaignOnClickCallback = (cmpgnId: string, cmpgnName: string) => Promise<void>;

    type Props = {
        onCampaignCreated: CampaignOnClickCallback
    }

    let {onCampaignCreated}: Props = $props()

    const{ settings, plugin } = getAppContext();

    let modalOpen = $state(false);
    let campaignName = $state("");
    const campaignList = $derived(settings.campaign.list)

    const showNewCampaignModal = () => {
        modalOpen = true
    };

    const onCreateCampaign = async () => {
        new Notice('Campaign created!');
        const campaignId = `rpg_cmpgn_id_${sc_randUUID()}`;
        await onCampaignCreated(campaignId, campaignName);
        modalOpen = false;
    };


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

<Setting>
    <Button text="Add new Campaign" onClick={showNewCampaignModal}/>
</Setting>

<Modal
    bind:open={modalOpen}
    title="Add Campaign"
>
    <SettingItemGroup>
        <Setting name="Campaign Name" description="Name of this awesome campaign">
            <Input type="text" onChange={(v) => campaignName = v} />
        </Setting>
        <Setting name="">
            <Button text="Create" onClick={onCreateCampaign} />
        </Setting>
    </SettingItemGroup>
</Modal>

<Modal
    bind:open={deleteCampaignState.modal}
    title="Remove Campaign?"
>
    <div class="confirm-modal-buttons">
        <Button warning onClick={onDeleteCampaign}>Yes</Button>
        <Button onClick={() => deleteCampaignState.modal = false}>No</Button>
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


