"use strict";

// GitHub related methods

var GitHubApi = require("github");

// Init GitHub API
var github = new GitHubApi();
github.authenticate({
  type: "oauth",
  token: process.env["GITHUB_OAUTH_TOKEN"],
});


module.exports.getGithubTags = function (owner, repo) {
  console.log(`Fetching all Github tags for ${owner}/${repo}`);
  return new Promise(function (resolve, reject) {
    let tags = [];
    function getPage(page) {
      //console.log(" page", page);
      github.repos.getTags({owner, repo, page, per_page: 100}).then(list => {
        if (list.length > 0) {
          list.forEach(x => tags.push(x.name));
          getPage(page + 1);
        } else {
          console.log(`${tags.length} git tags fetched.`);
          resolve(tags);
        }
      }, (x) => {
        console.error(x);
        reject();
      });
    }
    getPage(1);
  });
};

