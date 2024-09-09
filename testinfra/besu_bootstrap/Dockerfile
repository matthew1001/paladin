FROM golang:1.22

WORKDIR /usr/src/app

COPY go.mod go.sum /usr/src/app/

# Download dependencies indeoendently from the build process to cache them
RUN go mod download

COPY besu_bootstrap/ /usr/src/app/besu_bootstrap
RUN go build -o /usr/local/bin/besu_bootstrap ./besu_bootstrap

ENTRYPOINT [ "/usr/local/bin/besu_bootstrap" ]
