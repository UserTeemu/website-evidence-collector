# Website Evidence Collector running in a tiny Alpine Docker container
#
# Usage:
#
# build from source code folder using either Docker or Podman: podman build -t website-evidence-collector -f Containerfile
# running the container automatically starts the server mode
# run container with e.g.:
#   podman run -d -p 8080:8080 localhost/website-evidence-collector:latest
# and connect using the browser on localhost:8080/

# connect to the running container using:
#    podman exec -it -l  bash
# Then execute commands using wec e.g.:
#    wec http:example.com
#    wec reporter path/to/inspection.json
#
# If you hit the Error: EACCES: permission denied,
# then try "mkdir output && chown 1000 output"

# Define ARGs that can be set during build
ARG TESTSSL_VERSION=3.0.6

FROM alpine:3.20.0 AS alpine-with-dependencies

# Installs latest Chromium (77) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs  \
      # Packages linked to testssl.sh
      bash procps drill coreutils libidn curl \
      # Toolbox for advanced interactive use of WEC in container
      parallel jq grep aha

FROM alpine-with-dependencies AS build

RUN apk add --no-cache npm

WORKDIR /opt/website-evidence-collector/

# Install Dependencies for WEC
COPY package.json package-lock.json ./

RUN npm ci

# Build frontend
COPY frontend/ ./frontend/

RUN npm run build-frontend

# Copy remainder of WEC
COPY . .

RUN npm run build-ts    && \
    npm run copy-assets && \
    cd build/           && \
    npm install --omit=dev && \
    chmod +x /opt/website-evidence-collector/build/bin/website-evidence-collector.js

FROM alpine-with-dependencies

LABEL maintainer="Robert Riemann <robert.riemann@edps.europa.eu>"

LABEL org.label-schema.description="Website Evidence Collector running in a tiny Alpine Docker container" \
      org.label-schema.name="website-evidence-collector" \
      org.label-schema.usage="https://github.com/EU-EDPS/website-evidence-collector/blob/master/README.md" \
      org.label-schema.vcs-url="https://github.com/EU-EDPS/website-evidence-collector" \
      org.label-schema.vendor="European Data Protection Supervisor (EDPS)" \
      org.label-schema.license="EUPL-1.2"

# Use the ARG without a value to load the default defined on top
ARG TESTSSL_VERSION
ENV TESTSSL_VERSION=${TESTSSL_VERSION}

# Add user so we don't need --no-sandbox and match first linux uid 1000
RUN addgroup --system --gid 1001 collector \
      && adduser --system --uid 1000 --ingroup collector --shell /bin/bash collector \
      && mkdir -p /output \
      && chown -R collector:collector /output

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
# Let Puppeteer use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PATH="/home/collector/wec/bin:/opt/testssl.sh-${TESTSSL_VERSION}:${PATH}"

COPY --from=build  /opt/website-evidence-collector/build  /opt/website-evidence-collector

# Install Testssl.sh
RUN curl -SL https://github.com/drwetter/testssl.sh/archive/refs/tags/v${TESTSSL_VERSION}.tar.gz | tar -xz --directory /opt && \
    chown -R collector:collector /opt/website-evidence-collector && \
    chown -R collector:collector /home/collector

# Run everything after as non-privileged user.
USER collector

RUN ln -s /opt/website-evidence-collector /home/collector/wec


# Let website evidence collector run chrome without sandbox
# ENV WEC_BROWSER_OPTIONS="--no-sandbox"
# Configure default command in Docker container
ENTRYPOINT ["website-evidence-collector.js"]
CMD ["serve"]
EXPOSE 8080

WORKDIR /output
VOLUME /output
