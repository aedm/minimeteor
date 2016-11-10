"use strict";

// GitHub related methods

var GitHubApi = require("github");

const GITHUB_TOKEN = "MINIMETEOR_GITHUB_OAUTH_TOKEN";

const oauthToken = process.env[GITHUB_TOKEN];
if (!oauthToken) {
  console.error("GitHub API init error, please set environment variable", GITHUB_TOKEN);
  process.exit(1);
}

// Init GitHub API
var github = new GitHubApi();
github.authenticate({
  type: "oauth",
  token: oauthToken,
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
          tags.reverse();
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

