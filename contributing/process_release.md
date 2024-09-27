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

## Process for LTS release
* Using the GitLab GUI, create a branch from the release branch that we are declaring LTS. Bump the patch version by 1. For example, if we are declaring 1.36.0 to be LTS, then create a 1.36.1 branch from 1.36.0.
* On your local machine, fetch and checkout the LTS branch.
* Create a new local branch from the LTS branch (e.g. "prepare-1.36.1-release").
* Update the patch version in `package.json` and `package-lock.json`.  The release number of the new version should start at 0 (e.g. 1.36.0-4 would become 1.36.1-0).
* Add a new CHANGELOG section that looks like
    ```
    ## 1.36.1
    ### Added

    ### Fixed

    ### Changed
    - Promoted to LTS

    ### Removed
    ```
* Create an MR for these changes. Important: Remember to set the branch you are merging into to the LTS branch.
* Go to the atg-build project in GitLab
  * Edit the DO schedule to set the `gitBranch` variable to the LTS branch.
  * Run the DO schedule.
  * After the build completes, edit the DO schedule to set the `gitBranch` variable back to `develop`.
* Using the GUI create a tag off the LTS branch (e.g. 1.36.1)
  * In the GUI go to `Repository -> Tags -> New tag`.
  * The name of the tag should be the LTS version with a 'v' at the front (e.g. v1.36.1).
  * Update the `createFrom` to point at the LTS branch.
  * Set the message to: `LTS release v<LTS version>` (e.g. "LTS release v1.36.1")
* Merge the LTS branch (without updating the package version) into `develop` and create an MR for this.
* Merge the LTS branch (only update package version if LTS is latest) into `main` and create an MR for this.

## Process for release
### Begin process release at the very beginning of the first sprint of a new release, by performing the following actions
* Determine the `<version>` by using the major version, minor version, and patch number as the name (e.g 1.35.0).
* Create a new release branch with the name: `<version>`.
  * Using the GitLab UI, create the branch from `develop` to avoid any issues with an out-of-date local repository
* Update the release branch's schema via the following steps:
  * `git pull`
  * `git checkout <version>`
  * `mkdir -p src/schema/<version>`
  * `cp src/schema/latest/* src/schema/<version>`
  * git add and commit
  * `git push origin`
* Point the `gitBranch` variable in the DO schedule in the atg-build repository at the release branch
* Run the DO schedule from the atg-build repository in GitLab. This will:
  * Update and commit build number changes to `package.json` and `package-lock.json`
  * Tag the appropriate branch with the updated `<version>-<build>` (e.g. v1.35.0-4)
  * Upload the build to Artifactory
  * Send an email to the team with build details
* Point the `gitBranch` variable in the DO schedule in the atg-build repository back to `develop`
* Prepare the `develop` branch for the next development cycle
  * `git checkout develop`
  * `git pull`
  * Determine the `<new-version-number>` by incrementing the minor release number, and setting the patch number to 0 (e.g. 1.35.0 becomes 1.36.0).
  * `git checkout -b bump-to-<new-version-number>`
  * `git checkout <version> src/schema/<version>`
    * This pulls in the new schema directory from the release branch
  * Edit package.json and package-lock.json to `<new-version-number>-0` (e.g. 1.36.0-0).
  * Update the `info.version` property in `src/schema/latest/openapi.yaml` to `<new-version-number>` (e.g. 1.36.0).
  * Add `<new-version-number>` to the `schemaVersion` array in `src/schema/latest/base.schema.json`.
  * Adding a new block to `CHANGELOG.md` with the following content:
    ```
    ## <new-version-number>
    ### Added

    ### Fixed

    ### Changed

    ### Removed
    ```
  * git add, commit, and push.
  * Submit an MR for these changes and wait for approval. (Please don't merge this PR until release branch is merged and uploaded to Github)
* Perform the "Actions after confirming GO for release".

### Actions after confirming GO for release:
* Using the GUI, create 2 MRs
  * 1 MR to merge release branch to `main`.
  * 1 MR to merge release branch to `develop`.
  * Do not squash commits.
  * Do not delete branch.
  * You can self-approve and merge these MRs.
  * Note: If the GUI suggests a rebase, do a merge locally instead (see below). DO NOT TRUST the GUI rebase tool, it lies!
    * `git checkout <main/develop>`
    * `git pull`
    * `git checkout -b merge-<version>-to-<main/develop>`
    * `git merge <version>`
    * `git push`
    * Via GUI, create an MR to merge this into `<main/develop>`
* Using the GUI, create a tag on the `main` branch in the format `v<version>` (e.g. `v1.34.0`).
* Artifacts are copied from main to GitHub and Docker Hub by release management(atg-release).
* Merge the PR associated with next development cycle branch created as part of above section to `develop`
* Close your Jira task when the release is complete.

## Documentation Release process
* After the third sprint is finished and the release branch has been created, checkout out the dev release branch and then merge it into **doc-release-branch**.
* Make any additions or modifications to the **doc-release-branch** for items specific to the release.
  * Update the release version in the **conf.py** file.
  * Update the latest version in the **versions.json** files (in doc-release branch and any LTS doc branches (for example **docs-3.36.1**, and **doc-3.32.1**)). Do NOT push the versions.json file for the LTS branches until the release has gone out.
  * Update the support.md file if applicable (currently not applicable for AS3, but is applicable for DO)
  * Make sure the **revision-history.rst** file is up-to-date with all work done and the Issues resolved from the changelog.md file.
* On release day, wait for the announcement that the code has been pushed to Github.
* Checkout out **docs-latest**, and then merge the **doc-release-branch** into docs-latest.
* Push **docs-latest** which starts the publishing process to clouddocs.f5.com.
* Checkout each of the LTS doc branches and push the changes to the **versions.json** files.
* Merge **docs-latest** back into **develop**.
