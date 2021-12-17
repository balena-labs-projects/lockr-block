FROM node:12.22.7-alpine3.14

WORKDIR /usr/src/app

COPY package*.json ./

# install dependencies
RUN JOBS=MAX npm install --production --unsafe-perm && \
    npm cache verify && \
    rm -rf /tmp/*

COPY *.js *.sh ./

RUN chmod +x *.sh

CMD [ "./eval.sh" ]
