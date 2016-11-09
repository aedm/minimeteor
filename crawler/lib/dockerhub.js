"use strict";

let DockerHubAPI = require('docker-hub-api');

// Init Docker API
DockerHubAPI.setCacheOptions({enabled: true, time: 60});

module.exports.getDockerHubTags = function(owner, repo) {
  console.log(`Fetching all Docker Hub tags for ${owner}/${repo}`);
  return new Promise(function (resolve, reject) {
    let tags = [];

    function getPage(page) {
      //console.log(" page", page);
      DockerHubAPI.tags(owner, repo, {page, perPage: 100}).then(list => {
        list.forEach(x => tags.push(x.name));
        getPage(page + 1);
      }, () => {
        console.log(`${tags.length} docker tags fetched.`);
        resolve(tags);
      });
    }
    getPage(1);
  });
};
