#!/bin/sh

# Show program info when no arguments were given
if [ "$#" -eq 0 ]; then
    echo Usage: $0 dockertags
    exit
fi

# The project directory is always the current directory
PROJECTDIR=.

# Create a temporary directory
TEMPDIR=`mktemp -d`
echo Using temp dir: "$TEMPDIR"

# Assemble a list of Docker tags
DOCKERTAG=""
for arg in "$@"
do
  DOCKERTAG="$DOCKERTAG -t $arg"
done

# User and group id's.
# Containers will chown the directories they create to match the current user.
USERID=`id -u`
GROUPID=`id -g`

# Log to stdout
INFO="[minimeteor]"

echo "$INFO" Copying project files to temp directory
cp -r $PROJECTDIR $TEMPDIR/source


# ------------------------------
# Meteor build
# ------------------------------

echo "$INFO" Writing Meteor build script
cat >$TEMPDIR/meteorbuild.sh <<EOM
#!/bin/sh
echo "$INFO" Meteor container started
echo $INFO Copying project into build container

useradd --uid $USERID -m user

sudo -u user cp -r /dockerhost/source /home/user
cd /home/user

echo $INFO Installing tools
apt-get update
apt-get -y install curl procps python g++ make sudo
sudo -u user curl "https://install.meteor.com/" | sh

echo $INFO Installing NPM build dependencies
sudo -u user meteor npm install

echo $INFO Performing Meteor build
sudo -u user meteor build --directory /app/build

echo $INFO Copying bundle from build container to temp directory
sudo -u user cp -r /home/user /dockerhost/bundle

echo $INFO Meteor container finished
EOM

echo "$INFO" Setting executable rights on build script
chmod +x $TEMPDIR/meteorbuild.sh
echo "$INFO" Starting Meteor container
docker run -v $TEMPDIR:/dockerhost --rm debian /dockerhost/meteorbuild.sh

# ------------------------------
# Get Node version
# ------------------------------
NODE_VERSION=`sed 's/v//g' $TEMPDIR/bundle/.node_version.txt`

# ------------------------------
# Alpine build
# ------------------------------

echo "$INFO" Writing Alpine build script
cat >$TEMPDIR/alpinebuild.sh <<EOM
#!/bin/sh
echo $INFO Alpine container started
echo $INFO Copying project into build container
mkdir /app
cp -r /dockerhost/bundle /app/bundle

echo ${INFO} Installing tools
apk add --no-cache make gcc g++ python

echo $INFO Installing NPM build dependencies
cd /app/bundle/programs/server
npm install

echo $INFO Copying bundle to temp directory from inside of the build container
cp -r /app/bundle /dockerhost/bundle-alpine
chown -R $USERID:$GROUPID /dockerhost/bundle-alpine

echo $INFO Meteor container finished
EOM

echo "$INFO" Setting executable rights on Alpine build script
chmod +x ${TEMPDIR}/alpinebuild.sh
echo "$INFO" Starting Alpine build container
docker run -v ${TEMPDIR}:/dockerhost --rm mhart/alpine-node:${NODE_VERSION} /dockerhost/alpinebuild.sh


# ------------------------------
# Docker image build
# ------------------------------

echo "$INFO" Writing Dockerfile
cat >$TEMPDIR/bundle-alpine/Dockerfile <<EOM
# Dockerfile
FROM mhart/alpine-node:${NODE_VERSION}
ADD . /app
WORKDIR /app
ENV PORT 80
EXPOSE 80
CMD node main.js
EOM
echo "$INFO" Starting docker build
docker build $DOCKERTAG $TEMPDIR/bundle-alpine

# Removes temp directory
rm -rf $TEMPDIR

echo "$INFO" Build finished.
