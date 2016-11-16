# MiniMeteor

Build a **_small_** Docker image from your Meteor applications **_easily_**.

## Usage

```$ curl https://aedm.github.io/minimeteor/build.sh | sh -s```*```myDockerTag[s]```*

Just execute this command in your project directory. It builds a Docker image from your application. Meteor isn't even required, only Docker.

#### ...or create a Dockerfile instead.

`FROM aedm/minimeteor`

That's all.

## Okay, what's this?

MiniMeteor is an effort to simplify Docker image creation for Meteor projects. Right now it's in early stages, and works only with Meteor 1.4.2+, but the plan is to support every release from 1.3 above.

### Small Docker images for Meteor, really?

MiniMeteor's goal is to use as little overhead as possible. Some image sizes for the default Meteor application: (`meteor create`)

Method | Compressed size on Docker Hub | Uncompressed size
--- | --- | ---
MiniMeteor (1.4.2.1) via shell script | 20.0M | 65.3M
MiniMeteor (1.4.2.1) via Dockerfile | 42.0M | 127.8M

I'd like to include other projects in this table (eg. MeteorD, Meteor-Tupperware), but to my kownledge they're all broken as of 1.4.2. (If you know about a working version, please create an issue.)

### How to run it?

`$ docker run -d -e ROOT_URL=... -e MONGO_URL=... -e PORT=3000 -p 80:3000 myDockerTag`

### How does it work?

The shell script version has three passes to build the image:
 1. A Debian container build the Meteor bundle, and copies it back to the hsot machine using Docker volumes.
 2. An Alpine bundle rebuilds the binary NPM packages, because Alpine's CRT isn't fully compatible with Debian's.
 3. The final build is copied into a new [alpine-node](https://hub.docker.com/r/mhart/alpine-node/) container.
 
The Dockerfile version uses a different approach. It installs Meteor and all requires build tools into a debian/slim container, and after building the bundle, it copies the Node.js executable from the Meteor installation into the project directory, and removes all tools.

Pull requests are welcome.
 
