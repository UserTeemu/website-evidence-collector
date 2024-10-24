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

FROM alpine:3.20.0

LABEL maintainer="Robert Riemann <robert.riemann@edps.europa.eu>"

LABEL org.label-schema.description="Website Evidence Collector running in a tiny Alpine Docker container" \
      org.label-schema.name="website-evidence-collector" \
      org.label-schema.usage="https://github.com/EU-EDPS/website-evidence-collector/blob/master/README.md" \
      org.label-schema.vcs-url="https://github.com/EU-EDPS/website-evidence-collector" \
      org.label-schema.vendor="European Data Protection Supervisor (EDPS)" \
      org.label-schema.license="EUPL-1.2"

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
      npm \
# Packages linked to testssl.sh
      bash procps drill coreutils libidn curl \
# Toolbox for advanced interactive use of WEC in container
      parallel jq grep aha

# Add user so we don't need --no-sandbox and match first linux uid 1000
RUN addgroup --system --gid 1001 collector \
      && adduser --system --uid 1000 --ingroup collector --shell /bin/bash collector \
      && mkdir -p /output \
      && chown -R collector:collector /output

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# Let Puppeteer use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

ENV PATH="/home/collector/wec/built/bin:/opt/testssl.sh-3.0.6:${PATH}"

COPY . /opt/website-evidence-collector/

# Install Testssl.sh
RUN curl -SL https://github.com/drwetter/testssl.sh/archive/refs/tags/v3.0.6.tar.gz | \
      tar -xz --directory /opt

RUN chown -R collector:collector /opt/website-evidence-collector
RUN chown -R collector:collector /home/collector

# Run everything after as non-privileged user.
USER collector

WORKDIR /opt/website-evidence-collector/

RUN npm ci

RUN npm run setup

RUN chmod +x /opt/website-evidence-collector/built/bin/website-evidence-collector.js

WORKDIR /home/collector

RUN ln -s /opt/website-evidence-collector /home/collector/wec
# Create symlink so the program can be run as 'wec' from everywhere
RUN ln -s /opt/website-evidence-collector/built/bin/website-evidence-collector.js /opt/website-evidence-collector/built/bin/wec

# Let website evidence collector run chrome without sandbox
# ENV WEC_BROWSER_OPTIONS="--no-sandbox"
# Configure default command in Docker container
#ENTRYPOINT ["website-evidence-collector.js" ]
ENTRYPOINT ["website-evidence-collector.js"]
EXPOSE 8080

WORKDIR /output
VOLUME /output
