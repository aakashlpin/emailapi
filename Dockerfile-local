FROM ubuntu:18.04
# https://rtfm.co.ua/en/docker-configure-tzdata-and-timezone-during-build/
ENV TZ=Asia/Kolkata
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update -y

# Install Node.js
RUN apt-get install -y curl
RUN apt-get install -y gnupg-agent
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN curl --silent --location https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y build-essential
RUN apt install -y yarn
RUN node --version
RUN yarn --version

RUN apt-get install -y qpdf
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update
RUN apt-get install -y python3.8
RUN python3 --version
RUN apt-get install -y python3-tk ghostscript
RUN gs -version
RUN apt-get install -y python3-pip
RUN apt-get install -y libsm6 libxext6 libxrender-dev
RUN pip3 install 'opencv-python==4.2.0.34'
RUN pip3 install "camelot-py[cv]"

WORKDIR /codebase
COPY package.json ./
COPY yarn.lock ./
COPY . ./
COPY .env.docker.local ./.env.local
RUN yarn && yarn build
EXPOSE 3000
CMD ["yarn", "start"]