"use strict";

const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const fs = require('fs');
const DockerHub = require("./lib/dockerhub.js");
const stream = require('stream');

const NodeLabel = "NODE_VERSION=";
const QUEUE_FILE = "MINIMETEOR_ALPINE_NODE_BUILD_QUEUE_FILE";
const DOCKER_OWNER = "aedm";
const DOCKER_REPO = "meteor";

function makeTempDir() {
  try {
    return execSync("mktemp -d").toString().trim();
  } catch (ex) {
    console.error("Cannot create temp directory");
    process.exit(1);
  }
}

function getMeteorDockerfile(releaseURL) {
  return `# Dockerfile
FROM debian:latest

# Install Meteor
RUN apt-get update
RUN apt-get -y install curl procps python g++ make
RUN date
RUN curl ${releaseURL} | sh

# Runs an example Meteor project to warm up
RUN meteor --unsafe-perm create /root/meteortest
WORKDIR /root/meteortest
RUN meteor --unsafe-perm build .
WORKDIR /
RUN rm -rf /root/meteortest
RUN echo ${NodeLabel}\`meteor node --version\`  # ${Date.now().toString()}
`;
}


function appendNodeVersion(nodeVersion) {
  let queuePath = process.env[QUEUE_FILE];
  if (!queuePath) {
    console.error("Environment variable not found:", QUEUE_FILE);
    return;
  }
  console.log("Enqueueing Node.js version:", nodeVersion);
  fs.appendFileSync(queuePath, nodeVersion + "\n");
}


function batch(command) {
  console.log("Batching command: ", command);
  let batchCommand = `echo "${command} >/home/aedm/mm.log" | batch`;
  execSync(batchCommand, {stdio: "inherit"})
}


function buildMeteor(meteorVersion) {
  console.log("wat");

  let tempDir = makeTempDir();
  console.log("Using temp directory", tempDir);

  let dockerTag = `${DOCKER_OWNER}/${DOCKER_REPO}:${meteorVersion}`;
  console.log("Building", dockerTag);

  let releaseURL = "https://install.meteor.com/?release=" + meteorVersion;
  let content = getMeteorDockerfile(releaseURL);
  fs.writeFileSync(`${tempDir}/Dockerfile`, content);

  console.log("Running docker build...");
  let dockerProcess = spawn("docker", ["build", "-t", dockerTag, tempDir],
      {stdio: [null, null, "inherit"]});

  let output = "";
  dockerProcess.stdout.on('data', data => {
    let s = data.toString();
    process.stdout.write(s);
    output += s;
  });
  dockerProcess.on('close', code => {
    execSync(`rm -rf ${tempDir}`);
    if (code) {
      console.error("Build failed. Exit code:", code);
      return;
    }
    console.log("Build succesful.");

    // Enqueue alpine build
    let nodeVersion = output.split("\n").find(s => s.startsWith(NodeLabel));
    nodeVersion = nodeVersion.substring(NodeLabel.length).replace(/^(v)/, "");
    appendNodeVersion(nodeVersion);
    let alpineBuildCommand = `node --harmony ${__dirname}/build-alpinebuilder.js`;
    batch(alpineBuildCommand);

    // Push docker image
    console.log("Pushing image to Docker Hub");
    execSync(`docker push ${dockerTag}`, {stdio: "inherit"});

    console.log("Build successful:", dockerTag);
  });
}


function main() {
  if (process.argv.length != 3) {
    console.log(`Usage: node build-meteor.js {meteor-version}`);
    process.exit(0);
  }

  if (!process.env[QUEUE_FILE]) {
    console.error(`Environment variable ${QUEUE_FILE} not found.`);
    process.exit(1);
  }

  let meteorVersion = process.argv[2];

  DockerHub.getDockerHubTags(DOCKER_OWNER, DOCKER_REPO)
  .then(dockerTags => {
    if (!dockerTags.find(tag => tag == meteorVersion)) {
      buildMeteor(meteorVersion);
    } else {
      console.log("Already built", meteorVersion);
    }
  });
}

main();

