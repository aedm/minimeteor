#!/bin/sh

# Install build tools
apt-get -qq update
apt-get -y install curl procps python g++ make sudo >/dev/null

# Create non-root user
useradd -m user
sudo -u user cp -r /app /home/user/
cd /home/user/app

# Install Meteor
curl "https://install.meteor.com/" | sh

# Install NPM packages
sudo -u user meteor npm install

# Build Meteor app
sudo -u user meteor build --directory /home/user/meteor-app

# Install NPM packages in the bundle
cd /home/user/meteor-app/bundle/programs/server
sudo -u user meteor npm install

# Copy Node.js executable from Meteor distribution
cp `sudo -u user meteor node -e "console.log(process.argv[0]);"` ./
rm -rf /home/user/app

# Remove Meteor
rm /usr/local/bin/meteor
rm -rf ~/.meteor
rm -rf /home/user/.meteor

# Remove build tools and empty cache
apt-get -y --purge autoremove curl procps python g++ make
apt-get -y clean
rm -rf /var/lib/apt/lists/*
