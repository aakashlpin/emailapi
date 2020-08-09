FROM node:12.18.2

WORKDIR /codebase
COPY package.json ./
COPY yarn.lock ./
COPY . ./
RUN yarn && yarn build
EXPOSE 3000
CMD ["yarn", "start"]