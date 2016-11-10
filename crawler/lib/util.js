"use strict";

const fs = require('fs');
const execSync = require('child_process').execSync;

const Config = require("./config.js");

let MinimeteorDir = null;
let MeteorBuildQueueFile = null;
let AlpineBuildQueueFile = null;

(function() {
  MinimeteorDir = process.env[Config.MINIMETEOR_DIR_ENV];
  if (!MinimeteorDir) {
    console.error("Cannot find environment variable", Config.MINIMETEOR_DIR_ENV);
    process.exit(1);
  }
  try {
    fs.accessSync(MinimeteorDir, fs.W_OK);
  } catch (ex) {
    console.error(ex.toString());
    console.error("Cannot write into directory", MinimeteorDir);
    process.exit(1);
  }
  MeteorBuildQueueFile = `${MinimeteorDir}/${Config.METEOR_BUILD_QUEUE_FILE}`;
  AlpineBuildQueueFile = `${MinimeteorDir}/${Config.ALPINE_BUILD_QUEUE_FILE}`;
})();

/**
  Adds a command to the Linux task spooler. Uses "tsp".
 */
function enqueueCommand(command) {
  console.log("Enqueueing command: ", command);
  let batchCommand = `tsp -n bash -c "${command} | logger --tag minimeteor"`;
  try {
    execSync(batchCommand, {stdio: "inherit"})
  } catch (ex) {
    console.error(ex.toString());
  }
}

function getQueueFile(file) {
  try {
    let fileContent = fs.readFileSync(file).toString();
    return fileContent.split(/[\r\n]+/g).filter(line => line !== "");
  } catch (ex) {
    // If the file doesn't exist, that's ok.
    if (ex.code == "ENOENT") return [];
    console.error(ex.toString());
  }
}

function writeQueueFile(file, tags) {
  fs.writeFileSync(file, tags.join("\n") + "\n");
}

function enqueueBuild(file, tag) {
  let lines = getQueueFile(file);
  if (!lines.find(line => line == tag)) {
    lines.push(tag);
    writeQueueFile(file, lines);
  }
}

function spoolMeteorBuilder() {
  let command = `${Config.NODE_CMD} ${__dirname}/meteorbuilder.js`;
  enqueueCommand(command);
}

function spoolAlpineBuilder() {
  let command = `${Config.NODE_CMD} ${__dirname}/alpinebuilder.js`;
  enqueueCommand(command);
}

/**
 Returns the currently enqueued Meteor build tags
 */
function getMeteorQueue() {
  return getQueueFile(MeteorBuildQueueFile);
}

/**
  Returns the currently enqueued Alpine build tags
 */
function getAlpineQueue() {
  return getQueueFile(AlpineBuildQueueFile);
}

/**
 * Set Meteor build queue
 */
function setMeteorQueue(tags) {
  writeQueueFile(MeteorBuildQueueFile, tags);
  if (tags.length) spoolMeteorBuilder();
}

/**
 * Set Alpine build queue
 */
function setAlpineQueue(tags) {
  writeQueueFile(AlpineBuildQueueFile, tags);
  if (tags.length) spoolAlpineBuilder();
}

/**
  Adds a Meteor tag to the build queue.
 */
function enqueueMeteorTag(tag) {
  console.log("Enqueueing Meteor version:", tag);
  enqueueBuild(MeteorBuildQueueFile, tag);
  spoolMeteorBuilder();
}

/**
 Adds an Alpine tag to the build queue.
 */
function enqueueAlpineTag(tag) {
  console.log("Enqueueing Node.js version:", tag);
  enqueueBuild(AlpineBuildQueueFile, tag);
  spoolAlpineBuilder();
}

/**
 * Dequeue a file based on a list of already built Docker images.
 * @returns tag to build next
 */
function dequeueBuildTag(file, builtTags) {
  let tags = getQueueFile(file);

  let tag = null;
  while (tags.length > 0) {
    tag = tags.shift();
    if (!builtTags.find(x => x == tag)) {
      // Put it back on the end of the list, in case the build fails.
      tags.push(tag);
      break;
    }
  }
  writeQueueFile(file, tags);
  if (tags.length == 0) tag = null;
  return tag;
}

/**
 * Dequeues Meteor build list.
 * @param builtTags Already built images on Docker Hub
 * @returns tag to build next
 */
function deqeueMeteorTag(builtTags) {
  return dequeueBuildTag(MeteorBuildQueueFile, builtTags);
}

/**
 * Dequeues Alpine build list.
 * @param builtTags Already built images on Docker Hub
 * @returns tag to build next
 */
function deqeueAlpineTag(builtTags) {
  return dequeueBuildTag(AlpineBuildQueueFile, builtTags);
}


module.exports = {
  enqueueCommand,
  getMeteorQueue,
  setMeteorQueue,
  getAlpineQueue,
  setAlpineQueue,
  enqueueMeteorTag,
  enqueueAlpineTag,
  deqeueMeteorTag,
  deqeueAlpineTag,
  spoolMeteorBuilder,
};