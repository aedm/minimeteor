# Dockerfile
FROM debian:wheezy-slim

ADD ./onbuild.sh /minimeteor/

ONBUILD ADD . /app
ONBUILD WORKDIR /app
ONBUILD RUN /minimeteor/onbuild.sh
ONBUILD CMD cd /meteor-app/bundle/programs/server/ && ./node boot.js program.json
