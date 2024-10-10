<script setup lang="ts" >
import Navbar from "./components/Navbar.vue";
</script>

<template>
  <main>
    <div class="h-screen justify-center items-center">
      <Navbar/>
      <RouterView />
    </div>
  </main>
</template>
