<script lang="ts">
	import Input from "./ui/base/Input.svelte";
    import Setting from "./ui/obsidian/SettingItem.svelte";
    import Button from "./ui/base/Button.svelte"
	import { HeaderWithIcon } from "rpg_shared/ui/custom";


    interface Props {
        userId?: string
    }

    let {userId = ""}: Props = $props()

    const test = (v: string) => {
        console.log(v);
    }
</script>


<HeaderWithIcon
    text='You'
    icon='circle-user'
>
</HeaderWithIcon>
<Setting
    name=""
    description="Your unique id, share it with your players so they can add you."
>
    <Input
        id="profile_id"
        type="text"
        placeholder="rpg_mstr_id_4c58112a-f325-4397-b5b7-db137ef42414"
        value={userId}
        onChange={test}
    />
    <Button icon="files" tooltip="Copy ID"/>

</Setting>

