"use strict";

let Version = require("./lib/version.js");
let GitHub = require("./lib/github.js");
let DockerHub = require("./lib/dockerhub.js");

const MeteorReleaseTag = "release/METEOR@";

function createBuildList(releaseTags, meteorDockerTags) {
  console.log("Creating build list");
  for (let tag of releaseTags) {
    let version = Version.fromString(tag);
    if (!version || version.isLessThan([1,4,2,1])) continue;
    console.log(tag);
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
      if (tag.startsWith(MeteorReleaseTag)) {
        //console.log(tag);
        releaseTags.push(tag.substring(MeteorReleaseTag.length));
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


