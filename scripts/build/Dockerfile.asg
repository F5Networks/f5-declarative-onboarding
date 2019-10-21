FROM f5devcentral/f5-api-services-gateway:latest as builder
ARG TARGET
COPY $TARGET /tmp
RUN rpm --nodeps -i /tmp/$(basename $TARGET)
RUN rm /tmp/$(basename $TARGET)

FROM f5devcentral/f5-api-services-gateway:latest
COPY --from=builder /var/config/rest/iapps/ /var/config/rest/iapps
