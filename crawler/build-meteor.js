"use strict";

const spawnSync = require('child_process').spawnSync;
const execSync = require('child_process').execSync;
const fs = require('fs');
const DockerHub = require("./lib/dockerhub.js");

const NodeLabel = "NODE_VERSION=";
const QUEUE_FILE = "MINIMETEOR_ALPINE_NODE_BUILD_QUEUE_FILE";
const DOCKER_OWNER = "aedm";
const DOCKER_REPO = "meteor";

function makeTempDir() {
  let command = spawnSync("mktemp", ["-d"]);
  if (command.error) {
    console.error("Cannot create temp directory");
    process.exit(1);
  }
  return command.stdout.toString().trim();
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


function buildMeteor(meteorVersion) {
  let tempDir = makeTempDir();
  console.log("Using temp directory", tempDir);

  let dockerTag = `${DOCKER_OWNER}/${DOCKER_REPO}:${meteorVersion}`;
  console.log("Building", dockerTag);

  let releaseURL = "https://install.meteor.com/?release=" + meteorVersion;
  let content = getMeteorDockerfile(releaseURL);
  fs.writeFileSync(`${tempDir}/Dockerfile`, content);

  console.log("Running docker build...");
  let dockerCommand = spawnSync("docker", ["build", "-t", dockerTag, tempDir],
      {stdio: [null, null, "inherit"]});

  let output = dockerCommand.stdout.toString();
  fs.writeFileSync("/var/log/minimeteor/build-" + meteorVersion + ".log", output);

  if (dockerCommand.status) {
    console.error("Build failed.");
    return;
  }
  console.log("Build succesful.");
  let nodeVersion = output.split("\n").find(s => s.startsWith(NodeLabel));
  nodeVersion = nodeVersion.substring(NodeLabel.length).replace(/^(v)/,"");
  appendNodeVersion(nodeVersion);

  console.log("Pushing image to Docker Hub");
  execSync(`docker push ${dockerTag}`, {stdio: "inherit"});

  console.log("Removing temp directory", tempDir);
  spawnSync("rm", ["-rf", tempDir]);

  // Enqueue alpine build
  let alpineBuildCommand = `echo node --harmony ${__dirname}/build-alpinebuilder.js | batch`;
  console.log("Executing: ", alpineBuildCommand);
  execSync(alpineBuildCommand, {stdio: "inherit"})
}


function main() {
  if (process.argv.length != 3) {
    console.log(`Usage: node build-meteor.js {meteor-version}`);
    process.exit(0);
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

