"use strict";

// Small lib to compare versions

class Version {
  constructor() {
    this.nums = [];

    // Version contains notation, like beta or release candidate
    this.isSubversion = false;
  }

  isAtLeast(versionArray) {
    let vl = versionArray.length;
    let tl = this.nums.length;
    let len = vl < tl ? vl : tl;
    for (let i=0; i<len; i++) {
      if (this.nums[i] < versionArray[i]) return false;
      if (this.nums[i] > versionArray[i]) return true;
    }
    return tl >= vl;
  }

  isLessThan(versionArray) {
    let vl = versionArray.length;
    let tl = this.nums.length;
    let len = vl < tl ? vl : tl;
    for (let i=0; i<len; i++) {
      if (this.nums[i] > versionArray[i]) return false;
      if (this.nums[i] < versionArray[i]) return true;
    }
    return tl < vl;
  }


  static fromString(versionString) {
    let nums = [];
    let isSubversion = false;
    let parts = versionString.split(/[\.-]/);
    for (let x of parts) {
      let n = parseInt(x);
      if (isNaN(n)) {
        isSubversion = true;
        break;
      }
      nums.push(n);
    }
    if (nums.length == 0) {
      // console.error(`Cannot parse version string "${versionString}"`);
      return;
    }

    let version = new Version();
    version.nums = nums;
    version.isSubversion = isSubversion;
    return version;
  }

}

module.exports = Version;