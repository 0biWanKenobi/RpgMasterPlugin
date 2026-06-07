<script lang="ts">
import Icon from "../base/Icon.svelte"

interface Props {
    icon: string,
    text: string
}

let {icon, text}: Props = $props()
</script>


<div class="setting-item setting-item-heading header-with-icon">
    <div class="setting-item-description">{text}</div>
    <div class="header-icon-wrapper">
        <Icon {icon}/>
    </div>
</div>