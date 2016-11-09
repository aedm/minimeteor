#!/bin/bash

function log {
  echo "----------------------"
  echo "[minimeteor autobuild] " $@
}

if [ "$#" -ne 1 ]; then
  echo Usage: $0 [meteor-version]
  exit
fi

# https://registry.hub.docker.com/v2/repositories/aedm/minimeteor/tags/

METEOR_VERSION=$1
RELEASE_URL="https://install.meteor.com/?release=$METEOR_VERSION"
DOCKER_TAG="aedm/meteor:$METEOR_VERSION"

TEMPDIR=`mktemp -d`
log Using temp directory $TEMPDIR

cat >$TEMPDIR/Dockerfile <<EOM
# Dockerfile
FROM debian

# Install Meteor
RUN apt-get update
RUN apt-get -y install curl procps python g++ make
RUN curl $RELEASE_URL | sh

# Runs an example Meteor project to warm up
RUN meteor --unsafe-perm create /root/meteortest
WORKDIR /root/meteortest
RUN meteor --unsafe-perm build .
WORKDIR /
RUN rm -rf /root/meteortest
EOM

log Building Meteor image
docker build -t $DOCKER_TAG $TEMPDIR
log Pushing docker image
docker push $DOCKER_TAG
log Removing docker image
docker rmi $DOCKER_TAG

log Cleaning up temp directory $TEMPDIR
rm -rf $TEMPDIR