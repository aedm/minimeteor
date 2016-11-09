"use strict";

// This script takes Node.js versions from a file,
// and builds the first not-yet-built "alpinebuilder" image from it.

const spawnSync = require('child_process').spawnSync;
const execSync = require('child_process').execSync;
const fs = require('fs');
const DockerHub = require("./lib/dockerhub.js");

const QUEUE_FILE = "MINIMETEOR_ALPINE_NODE_BUILD_QUEUE_FILE";
const DOCKER_OWNER = "aedm";
const DOCKER_REPO = "meteor-alpinebuild";


function makeTempDir() {
  let command = spawnSync("mktemp", ["-d"]);
  if (command.error) {
    console.error("Cannot create temp directory");
    process.exit(1);
  }
  return command.stdout.toString().trim();
}


function getAlpineBuilderDockerfile(nodeVersion) {
  return `# Dockerfile
FROM mhart/alpine-node:${nodeVersion}
RUN apk add --no-cache make gcc g++ python`;
}


function getNodeVersion(dockerTags) {
  let queuePath = process.env[QUEUE_FILE];
  if (!queuePath) {
    console.error("Environment variable not found:", QUEUE_FILE);
    process.exit(1);
  }

  let fileContent = fs.readFileSync(queuePath).toString();
  let versionQueue = fileContent.split(/[\r\n]+/g).filter(line => line !== "");
  console.log(`Found ${versionQueue.length} versions in ${queuePath}`);

  let version = null;
  while (versionQueue.length > 0) {
    version = versionQueue.shift();
    if (!dockerTags.find(tag => tag == version)) {
      versionQueue.push(version);
      break;
    }
  }
  fs.writeFileSync(queuePath, versionQueue.join("\n"));

  if (versionQueue.length == 0) {
    console.log("Nothing to build.");
    return;
  }

  return version;
}


function buildAlpineBuilder(dockerTags, tempDir) {
  let nodeVersion = getNodeVersion(dockerTags);
  if (!nodeVersion) return;

  let dockerTag = `${DOCKER_OWNER}/${DOCKER_REPO}:${nodeVersion}`;
  console.log("Building ", dockerTag);

  let content = getAlpineBuilderDockerfile(nodeVersion);
  fs.writeFileSync(`${tempDir}/Dockerfile`, content);

  console.log("Running docker build...");
  let dockerCommand = spawnSync("docker", ["build", "-t", dockerTag, tempDir], {stdio: "inherit"});
  if (dockerCommand.status) {
    console.error("Build failed.");
    return;
  }
  console.log("Build succesful, pushing to Docker Hub.");
  execSync(`docker push ${dockerTag}`, {stdio: "inherit"});
}


function main() {
  let tempDir = makeTempDir();
  console.log("Using temp directory", tempDir);

  DockerHub.getDockerHubTags(DOCKER_OWNER, DOCKER_REPO)
  .then(dockerTags => {
    buildAlpineBuilder(dockerTags, tempDir);

    console.log("Removing temp directory", tempDir);
    spawnSync("rm", ["-rf", tempDir]);
  });
}

main();

