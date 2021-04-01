FROM node:14
EXPOSE 2424

# App directory
WORKDIR /usr/src/app

# Set up dependences
COPY package.json .
COPY package-lock.json .
RUN npm install

# Copy over remaining files
COPY . .