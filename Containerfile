# Website Evidence Collector running in a tiny Alpine Docker container
#
# Usage:
#
# build from source code folder using either Docker or Podman: podman build -t website-evidence-collector -f Containerfile
# running the container automatically starts the server mode
# run container with e.g.:
#   podman run --rm -it -p 8080:8080 localhost/website-evidence-collector:latest
# and connect using the browser on localhost:8080/

# connect to the running container using:
#    podman exec -it -l  bash
# Then execute commands using wec e.g.:
#    wec http:example.com
#    wec reporter path/to/inspection.json
#
# If you hit the Error: EACCES: permission denied,
# then try "mkdir output && chown 1000 output"

ARG TESTSSL_VERSION=3.0.6

# Largely copied from https://github.com/jlandure/alpine-chrome/blob/master/with-puppeteer/Dockerfile
FROM alpine:3.20.0 AS chromium-base-image

RUN apk upgrade --no-cache --available \
    && apk add --no-cache \
      chromium-swiftshader \
      ttf-freefont \
      font-noto-emoji \
      make gcc g++ python3 git nodejs npm yarn \
    && apk add --no-cache \
      --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
      font-wqy-zenhei

COPY local.conf /etc/fonts/local.conf

# Add Chrome as a user
RUN mkdir -p /usr/src/app \
    && adduser -D chrome \
    && chown -R chrome:chrome /usr/src/app

# Run Chrome as non-privileged
USER chrome
WORKDIR /usr/src/app

ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    CHROMIUM_FLAGS="--disable-software-rasterizer --disable-dev-shm-usage" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

FROM alpine:3.20.0 AS build

RUN apk add --no-cache \
      bash \
      nodejs  \
      npm

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

FROM chromium-base-image AS wec

LABEL maintainer="Robert Riemann <robert.riemann@edps.europa.eu>"

LABEL org.label-schema.description="Website Evidence Collector running in a tiny Alpine Docker container" \
      org.label-schema.name="website-evidence-collector" \
      org.label-schema.usage="https://github.com/EU-EDPS/website-evidence-collector/blob/master/README.md" \
      org.label-schema.vcs-url="https://github.com/EU-EDPS/website-evidence-collector" \
      org.label-schema.vendor="European Data Protection Supervisor (EDPS)" \
      org.label-schema.license="EUPL-1.2"

USER root

RUN apk add --no-cache curl \
      nss \
      freetype freetype-dev \
      harfbuzz \
      ca-certificates \
      # Packages linked to testssl.sh
      bash procps drill coreutils libidn curl \
      # Toolbox for advanced interactive use of WEC in container
      parallel jq grep aha

ARG TESTSSL_VERSION
ENV TESTSSL_VERSION=${TESTSSL_VERSION}

RUN mkdir -p /output && chown -R chrome:chrome /output

ENV PATH="/home/collector/wec/bin:/opt/testssl.sh-${TESTSSL_VERSION}:${PATH}"

COPY --from=build  /opt/website-evidence-collector/build  /opt/website-evidence-collector

# Install Testssl.sh
RUN curl -SL https://github.com/drwetter/testssl.sh/archive/refs/tags/v${TESTSSL_VERSION}.tar.gz | tar -xz --directory /opt && \
    chown -R chrome:chrome /opt/website-evidence-collector && \
    mkdir -p /home/collector    && \
    chown -R chrome:chrome /home/collector

USER chrome

RUN ln -s /opt/website-evidence-collector /home/collector/wec

# ENV WEC_BROWSER_OPTIONS="--no-sandbox"
ENTRYPOINT ["website-evidence-collector.js"]
CMD ["serve"]
EXPOSE 8080

WORKDIR /output
VOLUME /output
