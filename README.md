# lockr-block

Apply application update locks by matching a URL response to a regular expression.

<https://www.balena.io/docs/learn/deploy/release-strategy/update-locking/>

## Usage/Examples

To use this image, add a service in your `docker-compose.yml` file as shown below.

```yml
services:
  ...
  lockr:
    # where <arch> is one of aarch64, armv7hf or amd64
    image: bh.cr/balenalabs/lockr-<arch>
```

To pin to a specific version of this block use:

```yml
services:
  ...
  lockr:
    # where <version> is the release semver or release commit ID
    image: bh.cr/balenalabs/lockr-<arch>/<version>
```

Here's an example to check if a jenkins server is busy by querying the API:

```yml
services:
  lockr:
    image: bh.cr/balenalabs/lockr-amd64
    environment:
      ENDPOINT: "https://jenkins.product-os.io/computer/api/xml?xpath=//busyExecutors"
      LOCK_REGEXP: "/<busyExecutors>0</busyExecutors>/"
      CREDENTIALS: "admin:password"
      INTERVAL: "30s"
```

Here's an example to check if a jenkins node is busy by querying the API:

```yml
services:
  lockr:
    image: bh.cr/balenalabs/lockr-amd64
    environment:
      ENDPOINT: "https://jenkins.product-os.io/computer/foobar/api/xml?xpath=//idle"
      LOCK_REGEXP: "/<idle>false</idle>/"
      CREDENTIALS: "admin:password"
      INTERVAL: "30s"
```

## Customization

### Environment Variables

To run this project, you will need the following environment variables in your container:

- `ENDPOINT`: Provide a URL to query with GET, the response will be processed as text.
- `CREDENTIALS`: If the above endpoint requires basic auth, provide it in the format `user:pass`.
- `LOCK_REGEXP`: Regular expression in the format `/foobar/` that will apply locks when matched.
- `INTERVAL`: Interval between each fetch and match execution. Default is `60s`.

## Contributing

Please open an issue or submit a pull request with any features, fixes, or changes.

## References

- <https://www.balena.io/docs/learn/deploy/release-strategy/update-locking/>
- <https://github.com/balena-io-playground/node-lockfile>
