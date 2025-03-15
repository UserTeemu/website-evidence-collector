# TinyProxy for Chrome with Proxy Authentication

This example demonstrates how to use a local `tinyproxy` instance to connect to an upstream proxy server that requires authentication. This is necessary because chromium does not support proxy authentication natively.

## Usage

#### 1. Build the custom tinyproxy image:

```bash
podman build -t custom-tinyproxy -f Containerfile
```

#### 2. Run the tinyproxy container with the necessary environment variable:

```bash
podman run -it --rm --name='tinyproxy' -e UPSTREAM_PROXY_CONFIG="username:password@upstream-proxy-host:port" localhost/custom-tinyproxy:latest
```

Replace `username`, `password`, `upstream-proxy-host`, and `port` with the appropriate values for your upstream proxy server.

The `UPSTREAM_PROXY_CONFIG` environment variable is used to configure the upstream proxy server details, including the username and password for authentication.

#### 3. Set the proxy for the website evidence collector

Set the proxy for the WEC using environment variables. For the default config the values should be `http_proxy=http://localhost:8888` `https_proxy=http://localhost:8888`.
