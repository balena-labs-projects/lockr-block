#!/bin/sh

echo "evaluating command..."

# substitute any environment variables
COMMAND="$(eval echo \"${COMMAND}\")"
export COMMAND

echo "=> ${COMMAND}"

# start lockr script
exec npm start
