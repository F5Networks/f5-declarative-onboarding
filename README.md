# F5 Declarative Onboarding

# Local build
## Build docker image with node and rpmbuild
```
cd build
docker build -t f5-decon .
```

## Build rpm
+ From f5-decon top level
```
docker container run --rm -v $(pwd):$(pwd) -w $(pwd) -i -t f5-decon build/buildRpm.sh
```