# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line.
SPHINXOPTS    =
SPHINXBUILD   = sphinx-build
SPHINXPROJ    = FDeclarativeOnboarding
SOURCEDIR     = docs
BUILDDIR      = docs/_build

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	npm ci
	node scripts/build/schema-build.js
	node scripts/build/schema-check.js
	node scripts/build/schema-to-rst.js
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

# Custom commands for building and testing project documentation

# build live preview of docs locally
.PHONY: preview
preview:
	@echo "Running autobuild. View live edits at:"
	@echo "  http://0.0.0.0:8000"
	@echo ""
	sphinx-autobuild --host 0.0.0.0 -b html $(SOURCEDIR) $(BUILDDIR)/html

# run docs quality tests locally
.PHONY: test
test:
	rm -rf docs/_build
	./scripts/test-docs.sh

# one-time html build using a docker container
.PHONY: docker-html
docker-html:
	rm -rf docs/_build
	./scripts/docker-docs.sh make html

# Build live preview of docs in a docker container
.PHONY: docker-preview
docker-preview:
	rm -rf docs/_build
	DOCKER_RUN_ARGS="-p 127.0.0.1:8000:8000" \
		./scripts/docker-docs.sh \
		sphinx-autobuild --host 0.0.0.0 -b html $(SOURCEDIR) $(BUILDDIR)/html

# run docs quality tests in a docker container
.PHONY: docker-test
docker-test:
	rm -rf docs/_build
	./scripts/docker-docs.sh ./scripts/test-docs.sh

# build an RPM from the current source tree
.PHONY: rpm
rpm:
	./scripts/rpmbuild.sh

# build an RPM from the current source tree in a docker container
.PHONY: docker-rpm
docker-rpm:
	./scripts/docker-rpmbuild.sh

