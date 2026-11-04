# Base manifests are pinned; refresh and review their digests before deployment.
FROM golang:1-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
WORKDIR /src/backend
COPY backend/go.mod ./
COPY backend/ ./
ARG BUILD_SHA=unknown
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X Z02INTRA.BuildSHA=${BUILD_SHA}" -o /out/exam ./cmd/monolith

# Docker client only: the correction daemon stays on the Linux host.
FROM docker:29-cli@sha256:5e6baf67325a79f64ed3bed6863954d5e05d0f3d4e57cbdb14809346814bbfdb
WORKDIR /app
COPY --from=build /out/exam /usr/local/bin/exam
COPY index.html app.js style.css blank.css version.js ./
COPY assets/ ./assets/
COPY vendor/ ./vendor/
COPY frontend/lib/ ./frontend/lib/
COPY learning-content/ ./learning-content/
COPY catalog-snapshots/ ./catalog-snapshots/
COPY Js_exam_instructions/ ./Js_exam_instructions/
COPY Js_exam_test/ ./Js_exam_test/
COPY LICENSE-MIT LICENSE-APACHE ./
ENTRYPOINT ["/usr/local/bin/exam"]
