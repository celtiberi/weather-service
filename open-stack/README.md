# Setting up a VM on OpenStack
## Step 1: Set up an Rumble Cloud account and create a project.

1. Go to the [Rumble Cloud website](https://docs.rumble.cloud/how_to/compute/create_a_vm_on_a_public_network.html#step-3-create-a-virtual-machine) and create an account.
2. Log in to your account and create a new project.

## Step 2: Create a virtual machine (VM) instance on Rumble Cloud.

1. Log in to your Rumble Cloud dashboard.
2. Navigate to the Compute section and click on Instances.
3. Click on Launch Instance and follow the instructions to create a new VM.
4. Set up your SSH key for the VM instance.

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
5. Login to docker
   ```sh
   docker login -u celtiberi -p <access_token>
   ```
6. Download the code from the weather-service repository:
   ```sh
   git clone https://github.com/celtiberi/weather-service
   ```

## Step 4: Install and configure Kubernetes on the VM instance.

1. Follow the official Kubernetes installation guide for your operating system.

## Step 5: Push your Docker images to a container registry accessible from the Rumble Cloud VM.

1. Make sure you are logged in to Docker Hub:
   ```sh
   docker login docker.io
   ```



## Step 1: Set up an OpenStack account and create a project.

1. Go to the OpenStack website and create an account.
2. Log in to your account and create a new project.

## Step 2: Create a virtual machine (VM) instance on OpenStack.

1. Log in to your OpenStack dashboard.
2. Navigate to the Compute section and click on Instances.
3. Click on Launch Instance and follow the instructions to create a new VM.
4. Set up your SSH key for the VM instance.

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
5. Login to docker
   ```sh
   docker login -u celtiberi -p <access_token>
   ```
6. Download the code from the weather-service repository:
   ```sh
   git clone https://github.com/celtiberi/weather-service
   ```

## Step 4: Install and configure Kubernetes on the VM instance.

1. Follow the official Kubernetes installation guide for your operating system.

## Step 5: Push your Docker images to a container registry accessible from the OpenStack VM.

1. Make sure you are logged in to Docker Hub:
   ```sh
   docker login docker.io -u <docker-hub-username> -p <docker-hub-access-token>
   ```
   Enter your Docker Hub username and password when prompted.

2. Navigate to the directory where your docker-compose.yml file is located.

3. On your OpenStack VM, make sure you have Docker and Docker Compose installed, and then run:
   ```sh
   sudo docker-compose pull
   sudo docker-compose up -d
   ```
   This command will pull the images from Docker Hub and start the containers.


