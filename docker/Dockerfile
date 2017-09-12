# Dockerfile
FROM debian:jessie-slim

ADD ./*.sh /minimeteor/

ONBUILD ARG NPM_TOKEN
ONBUILD ADD . /app
ONBUILD WORKDIR /app
ONBUILD ENV DEBIAN_FRONTEND noninteractive
ONBUILD RUN /minimeteor/onbuild.sh
ONBUILD ENV PORT 3000
ONBUILD EXPOSE 3000
ONBUILD USER user
ONBUILD CMD cd /home/user/meteor-app/bundle/programs/server/ && ./node boot.js program.json

CMD /minimeteor/onrun.sh
