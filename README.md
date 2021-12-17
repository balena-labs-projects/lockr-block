# lockr-block

Create or remove application update locks with the return code of any command.

<https://www.balena.io/docs/learn/deploy/release-strategy/update-locking/>

## Environment Variables

To run this project, you will need the following environment variables in your container:

- `COMMAND`: Any shell command that will be evaluated and if the return code is 0 (true) locks will be created.
- `INTERVAL`: Interval between each evaluation of the lock command. Default is `90s`.

## Usage/Examples

Here's an example to check if a jenkins node is busy by querying the API:

```yml
version: "2"

services:
  lockr:
    build: .
    environment:
      COMMAND: "curl -X GET --silent -u $JENKINS_USER http://$JENKINS_HOST/computer/$JENKINS_NODE/api/json | jq -r '.idle' | grep -q '^false$'"
      JENKINS_HOST: "jenkins.example.com"
      JENKINS_USER: "admin:password"
      JENKINS_NODE: "foobar"
```

Notice that environment variables are supported in `COMMAND` and will be substituted at container startup.

## References

- <https://www.balena.io/docs/learn/deploy/release-strategy/update-locking/>
- <https://github.com/balena-io-playground/node-lockfile>
