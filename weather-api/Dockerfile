FROM node:21.7.2

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application files to the working directory
COPY . .

# Expose the port on which the server will run
EXPOSE 3100

# Start the server
CMD ["node", "server.js"]
