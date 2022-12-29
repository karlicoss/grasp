<script>
import { onMount } from 'svelte'

import {getOptions, setOptions} from './options'
import {ensurePermissions, hasPermissions} from './permissions'


// hmm so look like it's not easy to bind options. fields in svelte
// better off binding to individual; properties
let endpoint = null
let notification = null
let default_tags = null

// true by default to prevent the warning div from flickering
let has_permission = true


// hmm a bit annoying that it triggers even before we mount
$: if (endpoint !== null) {
   // TODO hmm also triggers on invalid inputs?? a bit annoying
   hasPermissions(endpoint).then(result => {
     has_permission = result
   })
}


onMount(async () => {
   const opts = await getOptions()
   endpoint       = opts.endpoint
   notification   = opts.notification
   default_tags   = opts.default_tags
})


const saveOptions = async () => {
   const result = await ensurePermissions(endpoint)
   has_permission = result

   await setOptions({
     endpoint: endpoint,
     default_tags: default_tags,
     notification: notification,
   })

   // NOTE: seems that alert() only works here when we use open_in_tab: true for settings page
   // when open_in_tab: false, then
   // in chrome browser.extension.getBackgroundPage().alert works
   // in firefox that doesn't work, seems that it refuses to alert from bg page
   // so it seems easier to just always use opne_in_tab: true for setgings page
   alert('Saved!')
}

const IDS = {
  ENDPOINT      : 'endpoint_id',
  HAS_PERMISSION: 'has_permission_id',
  NOTIFICATION  : 'notification_id',
  DEFAULT_TAGS  : 'default_tags_id',
  SAVE          : 'save_id',
}
</script>

<style>
input:invalid {
  background-color: red;
}
</style>

<main>

<fieldset>
  <legend>Endpoint</legend>
  <input
    type='URL'
    id={IDS.ENDPOINT}
    bind:value={endpoint}
    size='40'
  />
  {#if !has_permission }
  <div id={IDS.HAS_PERMISSION} style="color: red">
    No permission to access {endpoint}. Will request when you press "Save".
  </div>
  {/if}
</fieldset>

<label for={IDS.NOTIFICATION}>Notification after capture</label>
<div>
  <input
    type="checkbox"
    id={IDS.NOTIFICATION}
    bind:checked={notification}
  />
</div>

<label for={IDS.DEFAULT_TAGS}>Default tags</label>
<div>
  <input
    type="text"
    id={IDS.DEFAULT_TAGS}
    bind:value={default_tags}
  />
</div>

<div>
  <button
    id={IDS.SAVE}
    on:click={saveOptions}
  >
    Save
  </button>
</div>

</main>
