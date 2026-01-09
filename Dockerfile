FROM ghcr.io/puppeteer/puppeteer:latest

USER root

RUN apt-get install -y xvfb tini fonts-recommended fonts-noto-color-emoji
RUN fc-cache -f -v

RUN mkdir -p /var/cache/fontconfig
RUN mkdir -p /.cache/fontconfig
RUN chmod -R 777 /var/cache/fontconfig
RUN chmod -R 777 /.cache/fontconfig

USER $PPTRUSER_UID

RUN mkdir /home/pptruser/user-data

COPY ./package.json ./package.json

RUN npm i

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

RUN npm run build

ENTRYPOINT ["tini", "--"]