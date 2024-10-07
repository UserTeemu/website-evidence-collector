<!-- EvidenceCollectionForm.vue -->
<template>
  <div class="flex flex-col md:flex-row">
    <div class="w-full md:w-2/6 px-4 my-auto">
      <Vueform
          :endpoint=false
          @submit=handleSubmit
          validate-on="step|change"
          :display-errors="true"
      >
        <StaticElement
            name="title"
            tag="h1"
            content="Evidence Collection Form"
        />
        <TextElement
            name="website_url"
            :rules="[
        'required',
      ]"
            input-type="url"
            placeholder="http://example.com"
        />
        <ButtonElement
            name="submit"
            button-label="Start collection"
            :submits="true"
            :full="true"
            align="center"
        />
      </Vueform>
    </div>
    <div
        class="inline-block h-screen min-h-[1em] w-0.5 self-stretch bg-neutral-100 dark:bg-white/10"></div>
    <div class="w-full md:w-4/6">
      <iframe :srcdoc="sanitizedHtml"  ref="iframe" class="h-screen iframe-container"></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";

const sanitizedHtml = ref('');

async function handleSubmit(form$, _)  {

const WEC_ENDPOINT="http://localhost:8080/start-collection"
  // Using FormData will EXCLUDE conditional elements and it
  // will submit the form as "Content-Type: multipart/form-data".
  const data = form$.data

  // Show loading spinner
  form$.submitting = true

  // Setting cancel token
  form$.cancelToken = form$.$vueform.services.axios.CancelToken.source()

  let response

  console.log(data)

  try {
    // Sending the request
    response = await form$.$vueform.services.axios.post(
      WEC_ENDPOINT,
      data,
      {
        cancelToken: form$.cancelToken.token,
      }
    )
  } catch (error) {
    // Handle error (status is outside of 2XX or other error)
    console.error('error', error)
    return
  } finally {
    // Hide loading spinner
    form$.submitting = false
  }

  // Handle success (status is 2XX)
  console.log('success', response.data)
  sanitizedHtml.value = response.data
}
</script>
<style scoped>
.iframe-container {
  width: 100%;

}
</style>
