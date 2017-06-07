#!/bin/sh

# Show program info when no arguments were given
if [ "$#" -eq 0 ]; then
    echo Usage: $0 dockertags
    exit
fi

# Log to stdout
INFO="[minimeteor]"

# The project directory is always the current directory
PROJECTDIR=.

# Create a temporary directory
TEMPDIR=`mktemp -d /tmp/minimeteor-XXXXXXXX`
echo Using temp dir: ${TEMPDIR}

# Assemble a list of Docker tags
DOCKERTAG=""
CONTAINERNAME="minimeteor"
for arg in "$@"
do
  DOCKERTAG="$DOCKERTAG -t $arg"
  argesc=`echo "$arg" | sed "s/[://]/--/g"`
  CONTAINERNAME="$CONTAINERNAME-$argesc"
done

# Containers will use the current user's id to perform non-root tasks (unless the user is root)
USERID=`id -u`
USERNAME="user"
USERHOME="/home/$USERNAME"
ADDUSER_COMMAND="adduser -D -u $USERID -h $USERHOME $USERNAME"  # Alpine
USERADD_COMMAND="useradd --uid $USERID -m $USERNAME"  # Debian
SUDO="sudo -u $USERNAME"
CPSUDO=${SUDO}
if [ ${USERID} -eq 0 ]; then
  # uid==0 is root, don't try to pass uid to adduser/useradd
  echo ${INFO} Building as 'root'
  ADDUSER_COMMAND="adduser -D -h $USERHOME $USERNAME"  # Alpine
  USERADD_COMMAND="useradd -m $USERNAME"  # Debian
  CPSUDO=""  # Copy the files back as root
fi

echo ${INFO} Copying project files to temp directory
cp -r ${PROJECTDIR} ${TEMPDIR}/source
rm -rf ${TEMPDIR}/source/node_modules
rm -rf ${TEMPDIR}/source/.meteor/local


# ------------------------------
# Meteor build
# ------------------------------

echo ${INFO} Writing Meteor build script
cat >${TEMPDIR}/meteorbuild.sh <<EOM
#!/bin/sh
echo ${INFO} Meteor container started

echo ${INFO} Updating apt
apt-get -qq update
echo ${INFO} Installing tools
apt-get -qq install curl procps python g++ make sudo git bzip2 >/dev/null

echo ${INFO} Copying files
${USERADD_COMMAND}
cp -r /dockerhost/source ${USERHOME}
chown -R ${USERNAME} ${USERHOME}/source
cd ${USERHOME}/source

${SUDO} curl "https://install.meteor.com/" | sh

echo ${INFO} Installing NPM build dependencies
cd ${USERHOME}/source
${SUDO} meteor npm --loglevel=silent install

echo ${INFO} Performing Meteor build
${SUDO} meteor build --directory ${USERHOME}/build

echo ${INFO} Copying bundle from build container to temp directory
${CPSUDO} cp -r ${USERHOME}/build/bundle /dockerhost

echo ${INFO} Meteor build container finished
EOM

echo ${INFO} Setting executable rights on build script
chmod +x ${TEMPDIR}/meteorbuild.sh
mkdir ${TEMPDIR}/bundle
echo ${INFO} Starting Meteor container
docker run -v ${TEMPDIR}:/dockerhost --rm --name ${CONTAINERNAME} debian /dockerhost/meteorbuild.sh

# ------------------------------
# Get Node version
# ------------------------------
NODE_VERSION=`sed 's/v//g' ${TEMPDIR}/bundle/.node_version.txt`

# ------------------------------
# Alpine build
# ------------------------------

echo ${INFO} Writing Alpine build script
cat >$TEMPDIR/alpinebuild.sh <<EOM
#!/bin/sh
echo ${INFO} Alpine container started, installing tools
apk add --no-cache make gcc g++ python sudo git bzip2

echo ${INFO} Copying project into build container
${ADDUSER_COMMAND}
cp -r /dockerhost/bundle ${USERHOME}/bundle-alpine
chown -R ${USERNAME} ${USERHOME}/bundle-alpine

echo ${INFO} Installing NPM build dependencies
cd ${USERHOME}/bundle-alpine/programs/server
${SUDO} npm install

echo ${INFO} Copying bundle to temp directory from inside of the build container
${CPSUDO} cp -r ${USERHOME}/bundle-alpine /dockerhost/bundle-alpine

echo ${INFO} Alpine build container finished
EOM

echo ${INFO} Setting executable rights on Alpine build script
chmod +x ${TEMPDIR}/alpinebuild.sh
echo ${INFO} Starting Alpine build container
docker run -v ${TEMPDIR}:/dockerhost --rm --name ${CONTAINERNAME} mhart/alpine-node:${NODE_VERSION} /dockerhost/alpinebuild.sh

# ------------------------------
# Docker image build
# The final image always creates a non-root user.
# ------------------------------

echo ${INFO} Writing Dockerfile
cat >${TEMPDIR}/bundle-alpine/Dockerfile <<EOM
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
echo ${INFO} Starting docker build
docker build ${DOCKERTAG} ${TEMPDIR}/bundle-alpine

# Removes temp directory
echo ${INFO} Removing temp directory ${TEMPDIR}
rm -rf ${TEMPDIR}

echo ${INFO} Build finished.
