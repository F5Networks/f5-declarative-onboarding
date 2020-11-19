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
* Create the branch from the `develop` branch.
* Create the branch using the GUI to avoid any issues with an out-of-date local repository.

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
  * Make sure the `gitBranch` CI/CD variable is set to the branch you want to build.
  * Run the schedule. This will:
    * Update and commit the build number in `package.json` and `package-lock.json` and commit those changes.
    * Tag the appropriate branch with the updated version (e.g. v1.13.0-4). The tag will kick off a DO pipeline with integration tests.
    * Send you a release email.
* If the DO pipleline is successful, that pipeline will upload the build artifacts to Artifactory. Once this happens, forward the release email to the `f5-declarative-onboarding` distribution list.

## Process for release
* Using the GUI, create an MR to merge the release branch to `master`. You can self-approve and merge this MR.
* Using the GUI, create an MR to merge the release branch to `develop`. You can self-approve and merge this MR.
* git checkout develop
* git pull
* Create and checkout a branch off of develop.
* Update the minor release number to the next version and reset the build number to 0. For example if you just released 1.13.0-4, update to 1.14.0-0
  * Update package.json and package-lock.json
  * Add the next version (without the build number) to the `schemaVersion` array in `base.schema.json`
  * git add and commit
* Submit an MR for these changes and wait for approval.

### GitHub Publishing (actions performed by release manager)
* Download the artifacts
  * Find the latest RC email for DO and follow the links to download the three artifacts
  * Place them in a sensible folder structure (ATC Release X/ > DO/ > artifacts)
  * Remove `.txt` from the sha256 artifact (Warning: if you are on Mac and using the GUI to rename, click 'Get Info' and confirm the `.txt` isn't simply hidden from view)
* Push to GitHub master:
  * Create local version of latest master
    * git clone git@gitswarm.f5net.com:automation-toolchain/f5-declarative-onboarding.git
    * cd f5-declarative-onboarding/
    * git checkout master
  * Create the GitHub remote (as needed):
    *  git remote add github https://github.com/f5networks/f5-declarative-onboarding.git
  * Push to remote master
    *  git push github master
    *  (enter GitHub username for release manager, followed by password: GitHub Access Token used for publishing)
  * Push release tag to remote master
    * git push github tag vX.Y.Z
    *  (enter GitHub username for release manager, followed by password: GitHub Access Token used for publishing)
* Create GitHub release - [GitHub Releases](https://github.com/f5networks/f5-declarative-onboarding/releases)
  * Navigate to the latest release, select `edit` and upload artifacts:
    * `.rpm` file
    * `.sha256` file
    * `.collection.json` file
  * Copy the [Document Revision History](https://automation-toolchain.pages.gitswarm.f5net.com/f5-declarative-onboarding/public-docs/revision-history.html) for the appropriate version
    * paste the bullet points in the "Write" box
    * remove end of line parenthesis
    * remove lines that seem specifically documentation related, unless very important
    * make sure the intro lines that contain the doc revision history link are copied from the previous GitHub release, and NOT a hyperlink from internal to F5 doc site.
