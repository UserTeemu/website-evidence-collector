<!-- EvidenceCollectionForm.vue -->
<template>
  <div class="flex flex-col md:flex-row bg:eu-background">
    <div class="w-full md:w-2/6">
      <div class="max-h-screen py-3 px-4 overflow-y-auto overflow-x-hidden">
        <Vueform
          :endpoint="false"
          @submit="handleSubmit"
          validate-on="step|change"
          :display-errors="true"
          add-class="vf-evidence-collection-form"
        >
          <StaticElement
            name="title"
            class="border-b-2 pb-3"
            tag="h1"
            content="Website Evidence Collector"
          />
          <TextElement
            name="website_url"
            field-name="url"
            :rules="['required', 'url']"
            input-type="url"
            :debounce="500"
            placeholder="http://example.com"
            :floating="false"
            :columns="{ lg: { container: 12 } }"
            label="Website for collection (mandatory)"
            info="Enter the URL of the website you want to collect evidence from, e.g., `http://example.com`"
          />
          <GroupElement name="container2_1">
            <GroupElement
              name="column1"
              :columns="{ default: { container: 8 } }"
            >
              <TextElement
                name="max_additional_links"
                input-type="number"
                onkeydown="return (!(event.key === 'e' || event.key === '+' || event.key === '.'))"
                :rules="['required', 'nullable', 'min:0', 'max:150', 'integer']"
                label="Maximum additional links to browse"
                autocomplete="off"
                placeholder="0"
                default="0"
                :floating="false"
                info="Set the maximum number of additional links to browse beyond the specified URLs"
              />
            </GroupElement>
            <GroupElement
              name="column2"
              :columns="{ default: { container: 4 } }"
            >
              <ToggleElement
                label="Check the security of the encrypted connection"
                name="run_testSSL"
                info="Enable this option to assess the website's SSL/TLS configuration"
                info-position="left"
              />
            </GroupElement>
          </GroupElement>
          <StaticElement name="divider" tag="hr" top="1" bottom="1" />
          <GroupElement name="container2">
            <GroupElement name="column1" :columns="{ container: 6 }">
              <TextElement
                name="post_page_load_delay_seconds"
                input-type="number"
                label="Delay after page load"
                onkeydown="return (!(event.key === 'e' || event.key === '+' || event.key === '.'))"
                :rules="['nullable', 'min:1', 'integer']"
                :messages="{
                  min: 'A minimum delay of 1 second is necessary to ensure the program has enough time to load the page',
                }"
                autocomplete="off"
                info="Specify the time (in seconds) to wait after each page load"
                placeholder="3"
                default="3"
                :floating="false"
                :addons="{ after: 'seconds' }"
              />
            </GroupElement>
            <GroupElement name="column2" :columns="{ container: 6 }">
              <TextElement
                name="timeout_seconds"
                label="Page load timeout"
                input-type="number"
                onkeydown="return (!(event.key === 'e' || event.key === '+' || event.key === '.'))"
                :rules="['nullable', 'min:0', 'integer']"
                autocomplete="off"
                info="Set the timeout (in seconds) for page loads. Set to 0 to disable the timeout"
                info-position="left"
                placeholder="0"
                :floating="false"
                default="0"
                :addons="{ after: 'seconds' }"
                :attrs="{ 'hide-spin-buttons': 'true' }"
              />
            </GroupElement>
          </GroupElement>
          <TextElement
            name="link_selection_seed"
            label="Seed for deterministic link selection"
            info="The software randomly samples links from the website. Setting a seed value ensures you get the same random sample each time – useful for reproducible results."
            placeholder="no seed"
            autocomplete="off"
            :floating="false"
          />
          <ListElement
            :add-class="{
              container: ['bg-eu-neutral-40', 'p-2', 'rounded-md'],
            }"
            name="first_party_uris"
            add-text="+ Add URI"
            label="URIs considered first party"
            info="Add URIs that should be considered as first-party for the collected website"
          >
            <!-- @vue-ignore -->
            <template #default="{ index }">
              <TextElement
                :name="index"
                input-type="url"
                placeholder="http://www.example.com"
                :debounce="500"
                :floating="false"
                field-name="uri"
                :rules="['url', 'nullable']"
              />
            </template>
          </ListElement>
          <ListElement
            :add-class="{
              container: ['bg-eu-neutral-40', 'p-2', 'rounded-md'],
            }"
            name="links_to_include"
            label="Web pages to include in collection"
            add-text="+ Add web page"
            info="Add specific pages to include in the collection process"
          >
            <!-- @vue-ignore -->
            <template #default="{ index }">
              <TextElement
                :name="index"
                input-type="url"
                field-name="link"
                :debounce="500"
                :floating="false"
                placeholder="http://example.com/test.html"
                :rules="['url', 'nullable']"
              />
            </template>
          </ListElement>
          <GroupElement
            name="cookies"
            :add-class="{
              container: ['bg-eu-neutral-40', 'p-2', 'rounded-md'],
            }"
          >
            <MatrixElement
              name="cookies"
              info="Set cookies that will be used by the browser during the evidence collection process"
              :cols="[
                {
                  label: 'Key',
                  value: 'key',
                  inputType: {
                    type: 'text',
                  },
                },
                {
                  label: 'Value',
                  value: 'value',
                  inputType: {
                    type: 'text',
                  },
                },
              ]"
              :rows="1"
              :input-type="{
                type: 'text',
              }"
              add-text="+ Add cookie"
              label="Cookies"
            />
          </GroupElement>
          <StaticElement name="divider_1" tag="hr" />
          <ButtonElement
            name="submit"
            button-label="Start collection"
            :submits="true"
            :full="true"
            class="m-1"
            align="center"
            :remove-class="{ button_enabled: ['hover:scale-105'] }"
            :add-class="{ button_enabled: ['hover:bg-eu-primary-80'] }"
          />
        </Vueform>
        <p class="text-0.5sm text-gray-600 text-center pt-2">
          Version {{ version == null ? "not fetched" : version }}
        </p>
      </div>
    </div>
    <!-- Right panel -->
    <div
      class="inline-block h-screen min-h-[2em] w-0.5 self-stretch bg-neutral-100 dark:bg-white/10"
    ></div>
    <div class="w-full md:w-4/6 relative">
      <!-- Display sanitized HTML in the success case. -->
      <div v-if="sanitizedHtml">
        <!-- Overlay bar -->
        <div
          v-if="!isDownloadOverlayMinimized"
          class="fixed flex flex-col mr-6 space-y-2 top-3 right-0 z-10 p-3 space-x-2 items-end bg-eu-neutral-100/50 rounded-md border-2 border-gray-300"
        >
          <button @click="toggleOverlayMinimization">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              class="fill-gray-500"
            >
              <path
                d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"
              />
            </svg>
          </button>
          <button
            class="bg-eu-primary hover:bg-eu-primary-80 text-white font-bold py-1 px-2"
            v-if="pdfUrl"
            @click="downloadPdf"
          >
            Download as PDF
          </button>
          <button
            class="bg-eu-primary hover:bg-eu-primary-80 text-white font-bold py-1 px-2"
            v-if="htmlUrl"
            @click="downloadHtml"
          >
            Download as HTML
          </button>
        </div>
        <div v-else @click="toggleOverlayMinimization">
          <div
            class="fixed flex hover:scale-105 top-0 right-8 h-11 w-11 bg-eu-primary-100 rounded-br-full rounded-bl-full items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="35px"
              viewBox="0 -960 960 960"
              width="35px"
              fill="#FFFFFF"
            >
              <path
                d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"
              />
            </svg>
          </div>
        </div>

        <div class="max-h-screen overflow-y-auto">
          <iframe
            :srcdoc="sanitizedHtml"
            ref="output-iframe"
            class="h-screen iframe-container"
          ></iframe>
        </div>
      </div>
      <div v-else class="flex items-center justify-center min-h-screen">
        <!-- Loading animation. -->
        <div
          v-if="isRequestRunning == true"
          role="status"
          class="flex items-center"
        >
          <p class="text-black text-lg font-semibold mr-2">Loading...</p>
          <svg
            aria-hidden="true"
            class="w-10 h-10 text-gray-200 animate-spin dark:text-gray-600 fill-eu-accent-140"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
        </div>
        <!-- Error message. -->
        <div v-else-if="errorMessage" class="p-6 text-center bg-white">
          <h1 class="text-3xl font-bold text-center text-eu-error mb-4">
            An error occurred
          </h1>
          <p class="text-lg text-gray-800">{{ errorMessage }}</p>
        </div>
        <!-- Placeholder for Output -->
        <div v-else class="p-6 text-center">
          <h1 class="text-2xl font-bold mb-4">Output will be displayed here</h1>
          <p class="text-gray-600">Enter a URL and submit the form to start</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from "vue";

// If the app is served using Vite we have to specify the server location.
// If it is served by the server itself a relative URL can be used.
const isViteDevEnv = import.meta.env.DEV;
const sanitizedHtml = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const pdfUrl = ref<string | null>(null);
const htmlUrl = ref<string | null>(null);
const isRequestRunning = ref<boolean>(false);
const iFrame = useTemplateRef("output-iframe");
const version = ref<string | null>(null);
const isDownloadOverlayMinimized = ref(true);

// Listen to chnages in the path from anchor links within the iFrame then scroll the corresponding element into view
window.addEventListener("hashchange", () => {
  let path = window.location.hash;
  if (path.charAt(0) == "#" && iFrame.value?.contentWindow?.document) {
    iFrame?.value?.contentWindow?.document
      ?.getElementById(path.substring(1))
      ?.scrollIntoView();
  }
});

function reset() {
  pdfUrl.value = null;
  htmlUrl.value = null;
  sanitizedHtml.value = null;
}

function getUrl(slug) {
  return isViteDevEnv
    ? `http://localhost:8080/${slug}`
    : new URL(slug, document.location.toString()).href;
}

window.onload = async (_) => {
  version.value = await fetchVersion();
};

async function fetchVersion() {
  let url = getUrl("version");
  const response = await fetch(url);
  const json = await response.json();
  return json.version;
}

async function handleSubmit(form$, _) {
  reset();

  // Using FormData will EXCLUDE conditional elements and it
  // will submit the form as "Content-Type: multipart/form-data".
  const data = form$.data;

  if (!URL.canParse(data.website_url)) {
    form$.messageBag.prepend(
      "The url needs to include the protocol, either https:// or https://",
    );
    return;
  }

  // Show loading spinner
  form$.submitting = true;
  form$.cancelToken = form$.$vueform.services.axios.CancelToken.source();
  isRequestRunning.value = true;

  let response;

  try {
    // Sending the request
    response = await form$.$vueform.services.axios.post(
      getUrl("/start-collection"),
      data,
      {
        cancelToken: form$.cancelToken.token,
      },
    );

    sanitizedHtml.value = response.data.html;

    createPdfUrl(base64ToBinary(response.data.pdf));
    createHtmlUrl(response.data.html);
  } catch (error: any) {
    console.log("An error occured.");
    console.log("error", error);
    console.log(response);

    if (error.response?.data?.reason) {
      errorMessage.value = error.response.data.reason;
    } else if (error.response) {
      errorMessage.value = `A HTTP ${error.response.status} error occurred.`;
    } else {
      errorMessage.value = `${error.message}`;
    }
  } finally {
    // Hide loading spinner
    form$.submitting = false;
    isRequestRunning.value = false;
  }
}

function base64ToBinary(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (m) => m.charCodeAt(0));
}

function toggleOverlayMinimization() {
  isDownloadOverlayMinimized.value = !isDownloadOverlayMinimized.value;
}

const createPdfUrl = (decodedBase64) => {
  const blob = new Blob([decodedBase64], { type: "application/pdf" });
  pdfUrl.value = URL.createObjectURL(blob);
};

const createHtmlUrl = (html) => {
  const blob = new Blob([html], { type: "text/html" });
  htmlUrl.value = URL.createObjectURL(blob);
};

const downloadPdf = () => {
  let url = pdfUrl.value as string;
  const link = document.createElement("a");
  link.href = url;
  link.download = "inspection.pdf";
  link.click();
  URL.revokeObjectURL(url);
};

const downloadHtml = () => {
  let url = htmlUrl.value as string;
  const link = document.createElement("a");
  link.href = url;
  link.download = "inspection.html";
  link.click();
  URL.revokeObjectURL(url);
};
</script>
<style scoped>
.iframe-container {
  width: 100%;
}

.vf-evidence-collection-form *,
.vf-evidence-collection-form *:before,
.vf-evidence-collection-form *:after,
.vf-evidence-collection-form:root {
  --vf-primary: #3860ed;
  --vf-primary-darker: #0a1f6c;
  --vf-color-on-primary: #ffffff;
  --vf-danger: #da1e28;
  --vf-danger-lighter: #da1e28;
  --vf-success: #ffffff;
  --vf-success-lighter: #24a148;
  --vf-gray-50: #f9fafb;
  --vf-gray-100: #f3f4f6;
  --vf-gray-200: #e5e7eb;
  --vf-gray-300: #d1d5db;
  --vf-gray-400: #9ca3af;
  --vf-gray-500: #6b7280;
  --vf-gray-600: #4b5563;
  --vf-gray-700: #374151;
  --vf-gray-800: #1f2937;
  --vf-gray-900: #111827;
  --vf-dark-50: #efefef;
  --vf-dark-100: #dcdcdc;
  --vf-dark-200: #bdbdbd;
  --vf-dark-300: #a0a0a0;
  --vf-dark-400: #848484;
  --vf-dark-500: #737373;
  --vf-dark-600: #393939;
  --vf-dark-700: #99aacc;
  --vf-dark-800: #546fa6;
  --vf-dark-900: #26324b;
  --vf-ring-width: 2px;
  --vf-ring-color: #bbb3ff;
  --vf-link-color: var(--vf-primary);
  --vf-link-decoration: inherit;
  --vf-font-size: 1rem;
  --vf-font-size-sm: 0.875rem;
  --vf-font-size-lg: 1rem;
  --vf-font-size-small: 0.875rem;
  --vf-font-size-small-sm: 0.8125rem;
  --vf-font-size-small-lg: 0.875rem;
  --vf-font-size-h1: 2.125rem;
  --vf-font-size-h1-sm: 2.125rem;
  --vf-font-size-h1-lg: 2.125rem;
  --vf-font-size-h2: 1.875rem;
  --vf-font-size-h2-sm: 1.875rem;
  --vf-font-size-h2-lg: 1.875rem;
  --vf-font-size-h3: 1.5rem;
  --vf-font-size-h3-sm: 1.5rem;
  --vf-font-size-h3-lg: 1.5rem;
  --vf-font-size-h4: 1.25rem;
  --vf-font-size-h4-sm: 1.25rem;
  --vf-font-size-h4-lg: 1.25rem;
  --vf-font-size-h1-mobile: 1.5rem;
  --vf-font-size-h1-mobile-sm: 1.5rem;
  --vf-font-size-h1-mobile-lg: 1.5rem;
  --vf-font-size-h2-mobile: 1.25rem;
  --vf-font-size-h2-mobile-sm: 1.25rem;
  --vf-font-size-h2-mobile-lg: 1.25rem;
  --vf-font-size-h3-mobile: 1.125rem;
  --vf-font-size-h3-mobile-sm: 1.125rem;
  --vf-font-size-h3-mobile-lg: 1.125rem;
  --vf-font-size-h4-mobile: 1rem;
  --vf-font-size-h4-mobile-sm: 1rem;
  --vf-font-size-h4-mobile-lg: 1rem;
  --vf-font-size-blockquote: 1rem;
  --vf-font-size-blockquote-sm: 0.875rem;
  --vf-font-size-blockquote-lg: 1rem;
  --vf-line-height: 1.5rem;
  --vf-line-height-sm: 1.25rem;
  --vf-line-height-lg: 1.5rem;
  --vf-line-height-small: 1.25rem;
  --vf-line-height-small-sm: 1.125rem;
  --vf-line-height-small-lg: 1.25rem;
  --vf-line-height-headings: 1.2;
  --vf-line-height-headings-sm: 1.2;
  --vf-line-height-headings-lg: 1.2;
  --vf-line-height-blockquote: 1.5rem;
  --vf-line-height-blockquote-sm: 1.25rem;
  --vf-line-height-blockquote-lg: 1.5rem;
  --vf-letter-spacing: 0px;
  --vf-letter-spacing-sm: 0px;
  --vf-letter-spacing-lg: 0px;
  --vf-letter-spacing-small: 0px;
  --vf-letter-spacing-small-sm: 0px;
  --vf-letter-spacing-small-lg: 0px;
  --vf-letter-spacing-headings: 0px;
  --vf-letter-spacing-headings-sm: 0px;
  --vf-letter-spacing-headings-lg: 0px;
  --vf-letter-spacing-blockquote: 0px;
  --vf-letter-spacing-blockquote-sm: 0px;
  --vf-letter-spacing-blockquote-lg: 0px;
  --vf-gutter: 1.25rem;
  --vf-gutter-sm: 0.6rem;
  --vf-gutter-lg: 1.25rem;
  --vf-min-height-input: 2.375rem;
  --vf-min-height-input-sm: 2.125rem;
  --vf-min-height-input-lg: 2.875rem;
  --vf-py-input: 0.375rem;
  --vf-py-input-sm: 0.375rem;
  --vf-py-input-lg: 0.625rem;
  --vf-px-input: 0.75rem;
  --vf-px-input-sm: 0.5rem;
  --vf-px-input-lg: 0.875rem;
  --vf-py-btn: 0.375rem;
  --vf-py-btn-sm: 0.375rem;
  --vf-py-btn-lg: 0.625rem;
  --vf-px-btn: 0.875rem;
  --vf-px-btn-sm: 0.75rem;
  --vf-px-btn-lg: 1.25rem;
  --vf-py-btn-small: 0.25rem;
  --vf-py-btn-small-sm: 0.25rem;
  --vf-py-btn-small-lg: 0.375rem;
  --vf-px-btn-small: 0.625rem;
  --vf-px-btn-small-sm: 0.625rem;
  --vf-px-btn-small-lg: 0.75rem;
  --vf-py-group-tabs: 0.375rem;
  --vf-py-group-tabs-sm: 0.375rem;
  --vf-py-group-tabs-lg: 0.625rem;
  --vf-px-group-tabs: 0.75rem;
  --vf-px-group-tabs-sm: 0.5rem;
  --vf-px-group-tabs-lg: 0.875rem;
  --vf-py-group-blocks: 0.75rem;
  --vf-py-group-blocks-sm: 0.625rem;
  --vf-py-group-blocks-lg: 0.875rem;
  --vf-px-group-blocks: 1rem;
  --vf-px-group-blocks-sm: 1rem;
  --vf-px-group-blocks-lg: 1rem;
  --vf-py-tag: 0px;
  --vf-py-tag-sm: 0px;
  --vf-py-tag-lg: 0px;
  --vf-px-tag: 0.4375rem;
  --vf-px-tag-sm: 0.4375rem;
  --vf-px-tag-lg: 0.4375rem;
  --vf-py-slider-tooltip: 0.125rem;
  --vf-py-slider-tooltip-sm: 0.0625rem;
  --vf-py-slider-tooltip-lg: 0.1875rem;
  --vf-px-slider-tooltip: 0.375rem;
  --vf-px-slider-tooltip-sm: 0.3125rem;
  --vf-px-slider-tooltip-lg: 0.5rem;
  --vf-py-blockquote: 0.25rem;
  --vf-py-blockquote-sm: 0.25rem;
  --vf-py-blockquote-lg: 0.25rem;
  --vf-px-blockquote: 0.75rem;
  --vf-px-blockquote-sm: 0.75rem;
  --vf-px-blockquote-lg: 0.75rem;
  --vf-py-hr: 0.25rem;
  --vf-space-addon: 0px;
  --vf-space-addon-sm: 0px;
  --vf-space-addon-lg: 0px;
  --vf-space-checkbox: 0.375rem;
  --vf-space-checkbox-sm: 0.375rem;
  --vf-space-checkbox-lg: 0.375rem;
  --vf-space-tags: 0.1875rem;
  --vf-space-tags-sm: 0.1875rem;
  --vf-space-tags-lg: 0.1875rem;
  --vf-space-static-tag-1: 1rem;
  --vf-space-static-tag-2: 2rem;
  --vf-space-static-tag-3: 3rem;
  --vf-floating-top: 0rem;
  --vf-floating-top-sm: 0rem;
  --vf-floating-top-lg: 0.6875rem;
  --vf-bg-input: #ffffff;
  --vf-bg-input-hover: #ffffff;
  --vf-bg-input-focus: #ffffff;
  --vf-bg-input-danger: #ffffff;
  --vf-bg-input-success: #ffffff;
  --vf-bg-checkbox: #ffffff;
  --vf-bg-checkbox-hover: #ffffff;
  --vf-bg-checkbox-focus: #ffffff;
  --vf-bg-checkbox-danger: #ffffff;
  --vf-bg-checkbox-success: #ffffff;
  --vf-bg-disabled: var(--vf-gray-200);
  --vf-bg-selected: #1118270d;
  --vf-bg-passive: var(--vf-gray-400);
  --vf-bg-icon: var(--vf-gray-500);
  --vf-bg-danger: var(--vf-danger-lighter);
  --vf-bg-success: var(--vf-success-lighter);
  --vf-bg-tag: var(--vf-primary);
  --vf-bg-slider-handle: var(--vf-primary);
  --vf-bg-toggle-handle: #ffffff;
  --vf-bg-date-head: var(--vf-gray-100);
  --vf-bg-addon: #ffffff00;
  --vf-bg-btn: var(--vf-primary);
  --vf-bg-btn-danger: var(--vf-danger);
  --vf-bg-btn-secondary: var(--vf-gray-200);
  --vf-color-input: var(--vf-gray-800);
  --vf-color-input-hover: var(--vf-gray-800);
  --vf-color-input-focus: var(--vf-gray-800);
  --vf-color-input-danger: var(--vf-gray-800);
  --vf-color-input-success: var(--vf-gray-800);
  --vf-color-disabled: var(--vf-gray-400);
  --vf-color-placeholder: var(--vf-gray-300);
  --vf-color-passive: var(--vf-gray-700);
  --vf-color-muted: var(--vf-gray-500);
  --vf-color-floating: var(--vf-gray-500);
  --vf-color-floating-focus: var(--vf-gray-500);
  --vf-color-floating-success: var(--vf-gray-500);
  --vf-color-floating-danger: var(--vf-gray-500);
  --vf-color-danger: var(--vf-danger);
  --vf-color-success: var(--vf-success);
  --vf-color-tag: var(--vf-color-on-primary);
  --vf-color-addon: var(--vf-gray-800);
  --vf-color-date-head: var(--vf-gray-700);
  --vf-color-btn: var(--vf-color-on-primary);
  --vf-color-btn-danger: #ffffff;
  --vf-color-btn-secondary: var(--vf-gray-700);
  --vf-border-color-input: #b9c5e9;
  --vf-border-color-input-hover: var(--vf-gray-300);
  --vf-border-color-input-focus: var(--vf-primary);
  --vf-border-color-input-danger: var(--vf-gray-300);
  --vf-border-color-input-success: var(--vf-gray-300);
  --vf-border-color-checkbox: var(--vf-gray-300);
  --vf-border-color-checkbox-focus: var(--vf-primary);
  --vf-border-color-checkbox-hover: var(--vf-gray-300);
  --vf-border-color-checkbox-danger: var(--vf-gray-300);
  --vf-border-color-checkbox-success: var(--vf-gray-300);
  --vf-border-color-checked: var(--vf-primary);
  --vf-border-color-passive: var(--vf-gray-300);
  --vf-border-color-slider-tooltip: var(--vf-primary);
  --vf-border-color-tag: var(--vf-primary);
  --vf-border-color-btn: var(--vf-gray-500);
  --vf-border-color-btn-danger: var(--vf-danger);
  --vf-border-color-btn-secondary: var(--vf-gray-200);
  --vf-border-color-blockquote: var(--vf-gray-300);
  --vf-border-color-hr: var(--vf-gray-300);
  --vf-border-color-signature-hr: var(--vf-gray-300);
  --vf-border-width-input-t: 1px;
  --vf-border-width-input-r: 1px;
  --vf-border-width-input-b: 1px;
  --vf-border-width-input-l: 1px;
  --vf-border-width-radio-t: 1px;
  --vf-border-width-radio-r: 1px;
  --vf-border-width-radio-b: 1px;
  --vf-border-width-radio-l: 1px;
  --vf-border-width-checkbox-t: 1px;
  --vf-border-width-checkbox-r: 1px;
  --vf-border-width-checkbox-b: 1px;
  --vf-border-width-checkbox-l: 1px;
  --vf-border-width-dropdown: 1px;
  --vf-border-width-btn: 1px;
  --vf-border-width-toggle: 0.125rem;
  --vf-border-width-tag: 1px;
  --vf-border-width-blockquote: 3px;
  --vf-shadow-input: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-input-hover: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-input-focus: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-handles: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-handles-hover: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-handles-focus: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-btn: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-dropdown: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-radius-input: 0.25rem;
  --vf-radius-input-sm: 0.25rem;
  --vf-radius-input-lg: 0.25rem;
  --vf-radius-btn: 0.25rem;
  --vf-radius-btn-sm: 0.25rem;
  --vf-radius-btn-lg: 0.25rem;
  --vf-radius-small: 0.25rem;
  --vf-radius-small-sm: 0.25rem;
  --vf-radius-small-lg: 0.25rem;
  --vf-radius-large: 0.25rem;
  --vf-radius-large-sm: 0.25rem;
  --vf-radius-large-lg: 0.25rem;
  --vf-radius-tag: 0.25rem;
  --vf-radius-tag-sm: 0.25rem;
  --vf-radius-tag-lg: 0.25rem;
  --vf-radius-checkbox: 0.25rem;
  --vf-radius-checkbox-sm: 0.25rem;
  --vf-radius-checkbox-lg: 0.25rem;
  --vf-radius-slider: 0.25rem;
  --vf-radius-slider-sm: 0.25rem;
  --vf-radius-slider-lg: 0.25rem;
  --vf-radius-image: 0.25rem;
  --vf-radius-image-sm: 0.25rem;
  --vf-radius-image-lg: 0.25rem;
  --vf-radius-gallery: 0.25rem;
  --vf-radius-gallery-sm: 0.25rem;
  --vf-radius-gallery-lg: 0.25rem;
  --vf-checkbox-size: 1rem;
  --vf-checkbox-size-sm: 0.875rem;
  --vf-checkbox-size-lg: 1rem;
  --vf-gallery-size: 6rem;
  --vf-gallery-size-sm: 5rem;
  --vf-gallery-size-lg: 7rem;
  --vf-toggle-width: 3rem;
  --vf-toggle-width-sm: 2.75rem;
  --vf-toggle-width-lg: 3rem;
  --vf-toggle-height: 1.25rem;
  --vf-toggle-height-sm: 1rem;
  --vf-toggle-height-lg: 1.25rem;
  --vf-slider-height: 0.375rem;
  --vf-slider-height-sm: 0.3125rem;
  --vf-slider-height-lg: 0.5rem;
  --vf-slider-height-vertical: 20rem;
  --vf-slider-height-vertical-sm: 20rem;
  --vf-slider-height-vertical-lg: 20rem;
  --vf-slider-handle-size: 1rem;
  --vf-slider-handle-size-sm: 0.875rem;
  --vf-slider-handle-size-lg: 1.25rem;
  --vf-slider-tooltip-distance: 0.5rem;
  --vf-slider-tooltip-distance-sm: 0.375rem;
  --vf-slider-tooltip-distance-lg: 0.5rem;
  --vf-slider-tooltip-arrow-size: 0.3125rem;
  --vf-slider-tooltip-arrow-size-sm: 0.3125rem;
  --vf-slider-tooltip-arrow-size-lg: 0.3125rem;
}
</style>
