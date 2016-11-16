# Dockerfile
FROM debian:wheezy-slim

ADD ./onbuild.sh /minimeteor/

ONBUILD ADD . /app
ONBUILD WORKDIR /app
ONBUILD RUN /minimeteor/onbuild.sh
ONBUILD ENV PORT 80
ONBUILD EXPOSE 80
ONBUILD CMD cd /meteor-app/bundle/programs/server/ && ./node boot.js program.json
