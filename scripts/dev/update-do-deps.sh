# Update deps to latest using npm-check-updates
# exlude version-pinned deps
# ---------------------------------------------
# ajv 6.x - Node.js incompatibility in newer major versions
# uuid 3.x - Node.js incompatibility in newer major versions
# sinon 7.x - Node.js incompatibility in newer major versions
# winston 2.x - breaking API change in 3.x (AUTOTOOL-1520)
# eslint 7.x - requires devs to use Node.js 16+ in newer major verisons
npx npm-check-updates -u -x ajv,uuid,sinon,winston,eslint
npm i
npm upgrade


git config --global user.email "DO_NOT_REPLY@f5.com"
git config --global user.name "F5 DO Pipeline"

git checkout $CI_BRANCH_NAME
git remote set-url origin https://$DO_ACCESS_TOKEN@$CI_SERVER_HOST/$CI_PROJECT_PATH.git

if [ -z "$(git status --porcelain)" ]; then
  echo "No DO dependency updates detected..."
else
    export AUTOTOOL_DIFF=true
    echo "DO dependency updates detected!"

    git checkout $UPDATE_BRANCH_NAME 2>/dev/null || git checkout -b $UPDATE_BRANCH_NAME;

    git add .
    git status
    git commit -m "Auto-update to DO deps"
fi

git checkout $CI_BRANCH_NAME
