<script lang="ts">

type Props = {
    children: any
}

const {children}: Props = $props();
</script>

<div class="setting-group">
    <div class="setting-items">
        {@render children()}
    </div>
</div>