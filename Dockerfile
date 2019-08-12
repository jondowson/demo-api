# ------------------------------------------
# Dockerfile: demo-api 
# ------------------------------------------

# retrieve: alpine base os with node + npm
FROM node:10-alpine

# install: alpine update + useful apps
RUN apk update
RUN apk upgrade
RUN apk add --update bash
RUN apk add --update nano 
RUN apk add --update curl
RUN apk add --update git

# setup: app folder as user root
RUN mkdir -p /home/node/
WORKDIR /home/node/

# retrieve: app code as user node
USER node
RUN git clone https://github.com/jondowson/demo-api.git

# permissions: change these on app folder as root
USER root
RUN chown -R node:node /home/node/demo-api

# install: app node modules as user node
USER node
WORKDIR /home/node/demo-api
RUN npm install

# start: demo-engine app in cluster mode (use all available cpus)
CMD [ "node", "src/cluster.js" ]