# Setting up a VM on OpenStack

## Step 1: Set up an OpenStack account and create a project.

1. Go to the OpenStack website and create an account.
2. Log in to your account and create a new project.

## Step 2: Create a virtual machine (VM) instance on OpenStack.

1. Log in to your OpenStack dashboard.
2. Navigate to the Compute section and click on Instances.
3. Click on Launch Instance and follow the instructions to create a new VM.

## Step 3: Install Docker on the VM instance.

1. SSH into your VM.
2. Make sure to have `curl` installed. If not, run the following commands:
   ```sh
   sudo apt-get update
   sudo apt-get install -y apt-transport-https curl
   ```

3. Run the following command to install Docker:
   ```sh
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```
4. Install Docker Compose on the VM:
   ```sh
   sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```
5. Copy the Docker config.json to the VM. It should have your credentials.
   ```sh
   scp ~/.docker/config.json ubuntu@<VM-IP>:~/.docker/config.json
   ```

## Step 4: Install and configure Kubernetes on the VM instance.

1. Follow the official Kubernetes installation guide for your operating system.

## Step 5: Push your Docker images to a container registry accessible from the OpenStack VM.

1. Make sure you are logged in to Docker Hub:
   ```sh
   docker login docker.io
   ```
   Enter your Docker Hub username and password when prompted.

2. Navigate to the directory where your docker-compose.yml file is located.

3. Build the images using Docker Compose:
   ```sh
   docker-compose build
   ```
   This command will build the images for the services that have a build context specified in the docker-compose.yml file.

4. Once the images are built, you can push them to Docker Hub:
   ```sh
   docker-compose push
   ```
   Docker Compose will push the images to Docker Hub using the image names and tags specified in the docker-compose.yml file.

5. Make sure you have the necessary permissions and quota on Docker Hub to push the images.

6. After the images are pushed, you can verify their presence on Docker Hub by visiting the respective repository pages:
   - [boat-api](https://hub.docker.com/r/celtiberi/boat-api)
   - [point-forecast-service](https://hub.docker.com/r/celtiberi/point-forecast-service)
   - [weather-api](https://hub.docker.com/r/celtiberi/weather-api)
   - [grib-downloader](https://hub.docker.com/r/celtiberi/grib-downloader)
   You should see the pushed images with the latest tag.

7. To deploy your application on the OpenStack VM, you can use the same docker-compose.yml file. Docker Compose will pull the images from Docker Hub instead of building them locally.

8. On your OpenStack VM, make sure you have Docker and Docker Compose installed, and then run:
   ```sh
   docker-compose up -d
   ```
   This command will pull the images from Docker Hub and start the containers.

## Step 6: Modify your Kubernetes deployment files to pull images from the container registry.

1. Update the image field in your Kubernetes deployment files to point to the registry URL.

## Step 7: Deploy your application using the modified Kubernetes deployment files.

1. Apply your Kubernetes deployment files to deploy your application.

## Step 8: Configure networking and expose your services.

1. Expose your services using Kubernetes services.

## Step 9: Monitor and manage your application on the OpenStack cloud platform.

1. Use Kubernetes tools to monitor and manage your application.