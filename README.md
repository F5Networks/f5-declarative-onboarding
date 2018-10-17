# F5 Declarative Onboarding

# Local build
## Build docker image with node and rpmbuild
```
cd build
docker build -t f5-declarative-onboarding .
```

## Build rpm
+ From f5-declarative-onboarding top level
```
docker container run --rm -v $(pwd):$(pwd) -w $(pwd) -i -t f5-declarative-onboarding build/buildRpm.sh
```