# DO Release Process

## Release Artifacts
* Each DO release has several artifacts:
  * RPM
  * RPM sha256 checksum
  * Postman collection of examples
* RPM is built in every pipeline run, and is kept in GitLab for one week
* On a Git tag, RPM is published to Artifactory (f5-automation-toolchain-generic/f5-declarative-onboarding)

## Release Notes
* Release notes are tracked during development in RELEASE_NOTES.md

## Release candidate process
* Determine version
  * \<fullVersion\> should be value found in package.json (e.g. 1.13.0-1)
  * \<version\> is \<fullVersion\> but only the major, minor, and patch numbers (e.g. 1.13.0)
* git checkout develop (or whichever branch you want to make a tag of)
* mkdir src/schema/\<version\>
* cp src/schema/latest/* src/schema/\<version\>
* git add and commit
* git tag -m 'Release candidate <fullVersion>' v\<fullVersion\>
* git push origin
* git push origin --tags
* Update base.schema.json, package.json and package-lock.json with next version (for example: X.Y+1.0, or X.Y.Z-#+1)
* git add and commit
* git push origin

## Release process
* git checkout X.Y.Z (the release branch)
* git pull
* git tag -m 'Release X.Y.Z' vX.Y.Z
* git push --tags
* git checkout master
* git merge <release_branch>
* git checkout develop
* git merge <release_branch>
* git push origin develop
* git push origin master

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
