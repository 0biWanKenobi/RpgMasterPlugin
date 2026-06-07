<script lang="ts">
	import HeaderWithIcon from "./ui/custom/HeaderWithIcon.svelte";
    import Setting from "./ui/obsidian/SettingItem.svelte";
    import Button from "./ui/base/Button.svelte";
	import Modal from "./ui/obsidian/Modal.svelte";
    import SettingItemGroup from "./ui/obsidian/SettingItemGroup.svelte";
	import SettingItem from "./ui/obsidian/SettingItem.svelte";
	import { sc_randUUID } from "rpg_shared/crypto";
	import { Notice } from "obsidian";

    type CampaignOnClickCallback = (cmpgnId: string, cmpgnName: string) => Promise<void>;

    type Props = {
        onCampaignCreated: CampaignOnClickCallback
    }

    let {onCampaignCreated}: Props = $props()

    let modalOpen = $state(false);
    let campaignName = $state("");

    const showNewCampaignModal = () => {
        modalOpen = true
    };

    const onCreateCampaign = async () => {
        new Notice('Campaign created!');
        const campaignId = `rpg_cmpgn_id_${sc_randUUID()}`;
        await onCampaignCreated(campaignId, campaignName);
        modalOpen = false;
    };

</script>


<HeaderWithIcon
    text='Campaigns'
    icon='scroll-text'
>
</HeaderWithIcon>

<Setting>
    <Button text="Add new Campaign" onClick={showNewCampaignModal}/>
</Setting>

<Modal 
    bind:open={modalOpen}
    title="Add Campaign"
>
    <SettingItemGroup>
        <SettingItem name="Campaign Name" description="Name of this awesome campaign">
            <input id="campaign_name" type="text" oninput={(v) => campaignName = v.currentTarget.value} />
        </SettingItem>
        <SettingItem name="">
            <Button text="Create" onClick={onCreateCampaign} />
        </SettingItem>
    </SettingItemGroup>
</Modal>
