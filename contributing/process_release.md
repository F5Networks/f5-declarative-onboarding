# DO Release Process

## Release Artifacts
* Each DO release has several artifacts:
  * RPM
  * RPM sha256 checksum
  * Postman collection of examples
* RPM is built in every pipeline run, and is kept in GitLab for one week
* On a Git tag, RPM is published to Artifactory (f5-automation-toolchain-generic/f5-declarative-onboarding)

## Release Notes
* Release notes are tracked during development in `CHANGELOG.md`

## Release branches
At some point in the sprint we create a release branch. This should happen when we need to work on a task for the release after the one we are currently working on. This is generally in the second half of the third sprint of a release.
* Create a new release branch using the major, minor, and patch version as the name. For example, 1.13.0
  * Create the branch using the GUI to avoid any issues with an out-of-date local repository.
  * Create the branch from the `develop` branch.
* Bump the minor version
  * git checkout develop
  * git pull
  * Create and checkout a branch off of develop
  * Edit package.json and package-lock.json to update the minor release number to the next version and reset the build number to 0. For example if you just created release branch 1.13.0, update to 1.14.0-0
  * Add the next version (without the build number) to the `schemaVersion` array in `base.schema.json`
  * Adding a new block to `CHANGELOG.md`
  * git add and commit
  * Submit an MR for these changes and wait for approval.

## Process for release candidates
* Determine `<version>` by looking in `package.json`. `<version>` is the full version without the the `-#`.
* If we already have a release branch
  * git checkout `<version>`
* If we don't already have a release branch
  * git checkout develop
* git pull
* mkdir -p src/schema/`<version>`
* cp src/schema/latest/* src/schema/`<version>`
* git add and commit
* git push origin
* Go to the DO schedule in the `atg-build` project.
  * Ping the Teams "AS3-DO General" channel to not push anything to develop until after pipeline is complete. Additionally, please provide a link to the pipeline as an edit or follow up comment, for other's convenience.
  * Make sure the `gitBranch` CI/CD variable is set to the branch you want to build.
  * Run the schedule. This will:
    * Update and commit the build number in `package.json` and `package-lock.json` and commit those changes.
    * Tag the appropriate branch with the updated version (e.g. v1.13.0-4). The tag will kick off a DO pipeline with integration tests.
    * Send you a release email.
* If the DO pipeline is successful, that pipeline will upload the build artifacts to Artifactory. Once this happens, forward the release email to the `f5-declarative-onboarding` distribution list.

## Process for release
* Using the GUI, create 2 MRs.
  * One MR to merge the release branch to `master`.
  * One MR to merge the release branch to `develop`.
  * Do not squash commits.
  * You can self-approve and merge these MRs.
* Using the GUI, create a tag on the `master` branch in the format `v<version>` (e.g. `v1.13.0`).
* Add a `released` property with a value of `true` to the released RPM in Artifactory.
