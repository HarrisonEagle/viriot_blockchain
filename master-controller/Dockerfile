FROM golang:1.18-alpine

ENV ROOT=/go/src/app
ENV CGO_ENABLED 0
WORKDIR ${ROOT}
ADD . ${ROOT}
RUN go build -o /go/bin/app
EXPOSE 3000

CMD ["app"]