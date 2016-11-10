"use strict";

const Version = require("./lib/version.js");
const GitHub = require("./lib/github.js");
const DockerHub = require("./lib/dockerhub.js");
const Util = require("./lib/util.js");
const Config = require("./lib/config.js");


function createBuildList(releaseTags, meteorDockerTags) {
  console.log("Creating build list");
  for (let tag of releaseTags) {
    if (meteorDockerTags.find(x => x == tag)) continue;
    let version = Version.fromString(tag);
    if (!version || version.isSubversion || version.isLessThan([1,4,2])) continue;
    Util.enqueueMeteorTag(tag);
  }
}

function main() {
  let releaseTags = [];
  let meteorDockerTags = [];

  GitHub.getGithubTags("meteor", "meteor")

  // Process GitHub tags
  .then(tags => {
    for (let tag of tags) {
      if (tag.startsWith(Config.METEOR_RELEASE_TAG)) {
        releaseTags.push(tag.substring(Config.METEOR_RELEASE_TAG.length));
      }
    }
    console.log(`${releaseTags.length} release tags found.`);
    return DockerHub.getDockerHubTags(Config.DOCKER_OWNER, Config.DOCKER_METEOR_IMAGE);
  })

  // Process aedm/meteor Docker tags
  .then(tags => {
    meteorDockerTags = tags;
    createBuildList(releaseTags, meteorDockerTags);
  });
}

main();


