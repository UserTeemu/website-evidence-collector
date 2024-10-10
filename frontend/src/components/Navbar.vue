<script setup lang="ts">

</script>

<template>
  <nav class="bg-white border-gray-200 border-b-2">
    <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
      <RouterLink class="flex items-center space-x-3 rtl:space-x-reverse" to="/">
        <!--        <img src="https://flowbite.com/docs/images/logo.svg" class="h-8" alt="Flowbite Logo" />-->
        <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">WEC</span>
      </RouterLink>

      <div class="hidden w-full md:block md:w-auto" id="navbar-default">
        <ul class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white ">
          <li>
            <RouterLink  class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0"
                         exactActiveClass="!text-blue-700" to="/">Home
            </RouterLink>
          </li>
          <li>
            <RouterLink
                class="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0"
                exactActiveClass="!text-blue-700" to="/previous-scans">Previous scans
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>

</template>

<style scoped>

</style>