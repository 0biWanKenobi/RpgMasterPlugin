<script lang="ts">
    type Props = {
        campaignsFolder: string;
    };

    let { campaignsFolder }: Props = $props();
</script>

<div>Folder outside Vault Location.</div>
<hr class="sep" />
<div class="campaign-location">
    You can create campaigns under <code>/{campaignsFolder}</code>.
</div>

<style>
    .sep {
        margin: 6px 0px;
    }

    .campaign-location {
        font-size: var(--font-ui-small);
    }

    code {
        corner-shape: var(--corner-shape);
        padding: 2px 4px 2px 8px;
        border-radius: var(--radius-m);
        background-color: var(--background-modifier-hover);
    }
</style>
