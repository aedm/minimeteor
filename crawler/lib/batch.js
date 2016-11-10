"use strict";

const execSync = require('child_process').execSync;

module.exports = function batch(command) {
  console.log("Batching command: ", command);
  let batchCommand = `echo "${command} >/home/aedm/mm.log" | batch`;
  execSync(batchCommand, {stdio: "inherit"})
};