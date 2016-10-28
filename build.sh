#!/bin/sh

if [ "$#" -ne 3 ]; then
    echo Usage: $0 [meteor-project-directory] [temp-directory] [docker-tag]
    exit
fi

PROJECTDIR=$1
TEMPDIR=$2
DOCKERTAG=$3

INFO="MINIMETEOR:"

echo $INFO Copying project files to temp directory
cp -r $PROJECTDIR $TEMPDIR/source

echo $INFO Writing Meteor build script
cat >$TEMPDIR/meteorbuild.sh <<EOM
#!/bin/sh
echo $INFO Meteor container started
echo $INFO Installing build tools
apt-get update
apt-get -y install curl procps python g++ make
echo $INFO Installing Meteor
curl https://install.meteor.com/ | sh   # Meteor 1.4.2

echo $INFO Copying project into build container
mkdir /app
cp -r /dockerhost/source /app/source

echo $INFO Installing NPM build dependencies
cd /app/source
meteor npm install

echo $INFO Performing Meteor build
meteor --unsafe-perm build --directory /app/build

echo $INFO Installing NPM runtime dependencies
cd /app/build/bundle/programs/server
meteor npm install

echo $INFO Copying bundle to temp directory from inside of the build container
cp -r /app/build/bundle /dockerhost/bundle-npm

echo $INFO Meteor container finished
EOM

echo $INFO Setting executable rights on write script
chmod +x $TEMPDIR/meteorbuild.sh

echo $INFO Starting Meteor container
docker run -v $TEMPDIR:/dockerhost --rm debian /dockerhost/meteorbuild.sh

echo $INFO Writing Dockerfile
cat >$TEMPDIR/bundle-npm/Dockerfile <<EOM
# Dockerfile
FROM node:4.6.1-slim
ADD . /app
WORKDIR /app
ENV PORT 80
EXPOSE 80
CMD node main.js
EOM

echo $INFO Starting docker build
docker build -t $DOCKERTAG $TEMPDIR/bundle-npm

echo $INFO Build finished.

