"use strict";

const Version = require("./lib/version.js");
const GitHub = require("./lib/github.js");
const DockerHub = require("./lib/dockerhub.js");
const batch = require("./lib/batch.js");

const METEOR_RELEASE_TAG = "release/METEOR@";

function createBuildList(releaseTags, meteorDockerTags) {
  console.log("Creating build list");
  for (let tag of releaseTags) {
    let version = Version.fromString(tag);
    if (!version || version.isSubversion || version.isLessThan([1,3])) continue;
    let alpineBuildCommand = `node --harmony ${__dirname}/build-meteor.js ${tag}`;
    batch(alpineBuildCommand);
  }
}

function main() {
  let releaseTags = [];
  let alpineDockerTags = [];
  let meteorDockerTags = [];

  GitHub.getGithubTags("meteor", "meteor")

  // Process GitHub tags
  .then(tags => {
    for (let tag of tags) {
      if (tag.startsWith(METEOR_RELEASE_TAG)) {
        //console.log(tag);
        releaseTags.push(tag.substring(METEOR_RELEASE_TAG.length));
      }
    }
    console.log(`${releaseTags.length} release tags found.`);
    return DockerHub.getDockerHubTags("mhart", "alpine-node");
  })

  // Process alpine-node Docker tags
  .then(tags => {
    alpineDockerTags = tags;
    return DockerHub.getDockerHubTags("aedm", "meteor");
  })

  // Process aedm/meteor Docker tags
  .then(tags => {
    meteorDockerTags = tags;
    createBuildList(releaseTags, meteorDockerTags);
  });
}

main();


