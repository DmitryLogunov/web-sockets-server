# Our first stage, that is the Builder
FROM jfyne/node-alpine-yarn AS builder
WORKDIR /usr/src/app
COPY . .
RUN yarn install
RUN yarn build
# RUN yarn test

# Second stage, that creates an image for production
FROM jfyne/node-alpine-yarn AS prod
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/config.schema.json .
COPY package* ./
CMD [ "node", "./dist/app.js" ]
