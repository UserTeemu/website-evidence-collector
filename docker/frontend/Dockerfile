FROM node:alpine3.20

RUN mkdir -p /app
WORKDIR /app

COPY frontend/package*.json .

    # Install node packages
RUN npm install
RUN npm i -g serve

COPY frontend/ .

RUN npm run build

EXPOSE 3000

CMD [ "serve", "-s", "dist" ]