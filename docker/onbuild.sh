#!/bin/sh

# Install build tools
apt-get update
apt-get -y install curl procps python g++ make

# Install Meteor
curl "https://install.meteor.com/" | sh

# Install NPM packages
meteor npm install

# Build Meteor app
meteor --allow-superuser build --directory /meteor-app

# Install NPM packages in the bundle
cd /meteor-app/bundle/programs/server 
meteor npm install

# Copy Node.js executable from Meteor distribution
cp `meteor node -e "console.log(process.argv[0]);"` ./ 

# Remove Meteor
rm /usr/local/bin/meteor
rm -rf ~/.meteor

# Remove build tools and empty cache
apt-get -y --purge autoremove curl procps python g++ make 
apt-get -y clean 
rm -rf /var/lib/apt/lists/*
