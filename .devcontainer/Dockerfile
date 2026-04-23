# Runtime is pinned to an exact patch release. Keep in sync with .node-version.
FROM node:24.22.1-bookworm

# Claude Code is installed with the native installer. This is the ONE place the version is pinned.
# Before each delivery: bump it, rebuild, run the smoke test and the instructor re-validation
# checklist, then publish. Participants never change it.
ARG CLAUDE_CODE_VERSION=2.1.311

RUN apt-get update \
    && apt-get install -y --no-install-recommends jq ripgrep less procps \
    && rm -rf /var/lib/apt/lists/*

# Pre-create the config directory so a named volume mounted here is owned by "node".
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node

USER node
ENV PATH="/home/node/.local/bin:${PATH}"
# Stop the background updater so the pinned version stays pinned during a course.
ENV DISABLE_AUTOUPDATER=1

RUN curl -fsSL https://claude.ai/install.sh | bash -s -- "${CLAUDE_CODE_VERSION}"

WORKDIR /workspaces/acme-orders
