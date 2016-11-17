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

echo $INFO Updating apt
apt-get -qq update
echo $INFO Installing tools
apt-get -qq -o Dpkg::Use-Pty=0 install curl procps python g++ make sudo >/dev/null

echo $INFO Copying files
useradd --uid $USERID -m user
sudo -u user cp -r /dockerhost/source /home/user/
cd /home/user/source

sudo -u user curl "https://install.meteor.com/" | sh

echo $INFO Installing NPM build dependencies
cd /home/user/source
sudo -u user meteor npm --loglevel=silent install

echo $INFO Performing Meteor build
sudo -u user meteor build --directory /home/user/build

echo $INFO Copying bundle from build container to temp directory
sudo -u user cp -r /home/user/build/bundle /dockerhost/bundle

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
echo $INFO Alpine container started, installing tools
apk add --no-cache make gcc g++ python sudo

echo $INFO Copying project into build container
adduser -D -u $USERID -h /home/user user
sudo -u user cp -r /dockerhost/bundle /home/user/bundle

echo $INFO Installing NPM build dependencies
cd /home/user/bundle/programs/server
sudo -u user npm install

echo $INFO Copying bundle to temp directory from inside of the build container
sudo -u user cp -r /home/user/bundle /dockerhost/bundle-alpine

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
RUN adduser -D -h /home/user user
ADD . /home/user
WORKDIR /home/user
ENV PORT 3000
EXPOSE 3000
USER user
CMD node main.js
EOM
echo "$INFO" Starting docker build
docker build $DOCKERTAG $TEMPDIR/bundle-alpine

# Removes temp directory
echo $INFO Removing temp directory $TEMPDIR
rm -rf $TEMPDIR

echo "$INFO" Build finished.
