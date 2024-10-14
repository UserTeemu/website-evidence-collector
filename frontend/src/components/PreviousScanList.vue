<script setup lang="ts">

interface PreviousScan {
  id: string;
  timestamp: string;
  host: string;
}

const props = defineProps({previousScans: Array<PreviousScan> });

const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('en-GB');

</script>

<template>
  <ul role="list" class="divide-y divide-gray-100">
            <li v-for="scan in props.previousScans" :key="scan.id" class="flex justify-between gap-x-6 py-5"
                @click="$emit('scan-clicked', scan)">
      <button class="w-full text-left flex justify-between gap-x-6">
        <div class="flex min-w-0 gap-x-4">
          <div class="min-w-0 flex-auto">
            <p class="text-sm font-semibold leading-6 text-gray-900">{{ scan.host }}</p>
          </div>
        </div>
        <div class="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
          <p class="text-sm leading-6 text-gray-900">Fetched
            <time :datetime="scan.timestamp">{{ formatDate(scan.timestamp) }}</time>
          </p>
        </div>
      </button>
    </li>
  </ul>
</template>

<style scoped>

</style>