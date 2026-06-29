<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import LeagueSelector from '$lib/components/LeagueSelector.svelte';

  let { data, children } = $props();
</script>

<Header>
  <LeagueSelector leagues={data.leagues} />
</Header>
<main class="page">
  {@render children()}
</main>
