# Update deps to latest using npm-check-updates
# exlude version-pinned deps
# ---------------------------------------------
# Go to the link in '${CONFLUENCE_URL}/display/PDESETEAM/Package+Dependencies+-+Pinned' to see a list
npx npm-check-updates -u -x ajv,uuid,sinon,winston,nock,chai,eslint
npm i
npm upgrade

# Colors
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$CI_COMMIT_REF_NAME" ]; then
    echo -e "${RED}CI_COMMIT_REF_NAME is required.${NC}"
    exit 1
fi

if [ -z "$DO_ACCESS_TOKEN" ]; then
    echo -e "${RED}DO_ACCESS_TOKEN is required.${NC}"
    exit 1
fi

if [ -z "$CI_SERVER_HOST" ]; then
    echo -e "${RED}CI_SERVER_HOST is required.${NC}"
    exit 1
fi

if [ -z "$CI_PROJECT_PATH" ]; then
    echo -e "${RED}CI_PROJECT_PATH is required.${NC}"
    exit 1
fi

if [ -z "$UPDATE_BRANCH_NAME" ]; then
    echo -e "${RED}UPDATE_BRANCH_NAME is required.${NC}"
    exit 1
fi

git config --global user.email "DO_NOT_REPLY@f5.com"
git config --global user.name "F5 DO Pipeline"

git checkout $CI_COMMIT_REF_NAME
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

git checkout $CI_COMMIT_REF_NAME
