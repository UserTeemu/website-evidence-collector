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
            :rules="['required']"

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
      <iframe :srcdoc="sanitizedHtml" ref="iframe" class="h-screen iframe-container"></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";

const sanitizedHtml = ref('');

async function handleSubmit(form$, _) {

  const WEC_ENDPOINT = "http://localhost:8080/start-collection"
  // Using FormData will EXCLUDE conditional elements and it
  // will submit the form as "Content-Type: multipart/form-data".
  const data = form$.data

  const urlPattern = /^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?$/;

  if(!urlPattern.test(data.website_url)) {
    form$.messageBag.prepend('The url needs to include the protocol, either https:// or https://')
    return;
  }

  // Show loading spinner
  form$.submitting = true

  // Setting cancel token
  form$.cancelToken = form$.$vueform.services.axios.CancelToken.source()

  let response;

  try {
    // Sending the request
    response = await form$.$vueform.services.axios.post(
        WEC_ENDPOINT,
        data,
        {
          cancelToken: form$.cancelToken.token,
        }
    )

    // Handle success (status is 2XX)
    console.log('success')
    sanitizedHtml.value = response.data

  } catch (error: any) {
    if (error.response.status === 400) {
      const errorData = error.response.data.reason;
      console.log(errorData)// Assuming error.response.data contains the data you want to interpolate
      sanitizedHtml.value = `<html><head>${errorData}</head></html>`;
    }
    console.error('error', error)
    return
  } finally {
    // Hide loading spinner
    form$.submitting = false
  }


}
</script>
<style scoped>
.iframe-container {
  width: 100%;
}
</style>
