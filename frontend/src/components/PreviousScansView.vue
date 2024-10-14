<!-- EvidenceCollectionForm.vue -->
<template>

  <div class="flex flex-col md:flex-row"> <!-- Define the Grid-->
    <div class="w-full md:w-2/6 px-4 pt-4 "> <!-- Define the first column -->
      <PreviousScanHeadline/>
      <PreviousScanList :previous-scans="previousScans" @scan-clicked="handleScanClick"/>
    </div>
    <div
        class="inline-block h-screen min-h-[1em] w-0.5 self-stretch bg-neutral-100 dark:bg-white/10"></div>
    <div class="w-full md:w-4/6">
      <iframe :srcdoc="sanitizedHtml" ref="iframe" class="h-screen iframe-container"></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";
import axios from "axios";
import {onMounted} from "vue";
import PreviousScanList from "./PreviousScanList.vue";
import PreviousScanHeadline from "./PreviousScanHeadline.vue";

const sanitizedHtml = ref('');
const previousScans = ref([])

// Define an async function to fetch data from the server
const fetchPreviousScans = async () => {
  try {
    const response = await axios.get('http://localhost:8080/previous-scans');
    previousScans.value = response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

async function handleScanClick(scan) {
  try {
    const response = await axios.get('http://localhost:8080/load-report', {
      params: {scanId: scan.id}
    });
    sanitizedHtml.value = response.data
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Call the fetchData function when the component is mounted
onMounted(fetchPreviousScans)

</script>
<style scoped>
.iframe-container {
  width: 100%;
}
</style>
