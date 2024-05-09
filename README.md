# Weather Application

This is a dockerized weather application that consists of several microservices working together to provide weather information and forecasting capabilities.

## Services

The application is composed of the following services:

1. **mongodb**: A MongoDB database for storing boat and weather data.
2. **rabbitmq**: A RabbitMQ message broker for communication between services.
3. **boat-api**: An API service for managing boat-related data.
4. **nws-forecast-service**: A service for gathering NWS weather forecast.
5. **weather-api**: An API service for retrieving weather information.
6. **grib-downloader**: A service for downloading GRIB (GRIdded Binary) weather data files.
7. **elasticsearch**: An Elasticsearch cluster for storing and searching log data.
8. **logstash**: A Logstash service for collecting and processing log data.
9. **kibana**: A Kibana dashboard for visualizing and analyzing log data.
10. **krakend**: An API gateway for managing and securing the application's APIs.
11. **grafana**: A Grafana dashboard for monitoring and visualizing application metrics.


## Prerequisites

Before running the application, make sure you have the following installed on your system:

- Docker Desktop
- Kubernetes (enabled in Docker Desktop)

## Getting Started

1. Clone the repository:
   ```sh
   git clone https://github.com/celtiberi/weather-service.git
   ```
2. Navigate to the project directory:
   ```sh
   cd weather-service
   ```
3. Get docker elk :
   ```sh
   git clone https://github.com/deviantony/docker-elk.git
   ```
3. Build and start the services:
   ```sh
   make build
   make up
   ```
   This command will build the necessary Docker images and start the services in detached mode.

5. Access the services:

   - MongoDB: `localhost:27017`
   - RabbitMQ Management: `localhost:15672`
   - Boat API: `localhost:3050`
   - Weather API: `localhost:3100`
   - Grib Downloader (debug port): `localhost:9231`
   - Elasticsearch: `localhost:9200`
   - Kibana: `localhost:5601`
   - Grafana: `localhost:3000`

6. Reach the point-forecast using the KrakenD API Gateway:
   ```sh
   curl http://localhost:8080/v1/point-forecast/14.350/-77.476
   ```

7. To stop the services, run:
   ```sh
   make down
   ```

## Configuration

The application can be configured using the following files:

- `rabbitmq.conf`: RabbitMQ configuration file.
- `definitions.json`: RabbitMQ definitions file.
- `krakend.json`: Endpoints and security are configured in this file.
- Environment variables for each service can be set in the `docker-compose.yml` file.
## Volumes

The application uses the following Docker volumes for data persistence:

- `mongodb_data`: Stores MongoDB database files.
- `rabbitmq_data`: Stores RabbitMQ data files.
- `grib_data`: Stores downloaded GRIB files.
- `grafana_data`: Stores Grafana data files.

## Networks

The services communicate with each other through a Docker bridge network named `weather`.

## Troubleshooting

- If any of the services fail to start, check the logs using `docker-compose logs <service-name>`.
- Make sure all the required ports are available and not being used by other applications.

## TODO

- Change the port on which Grafana is running (currently 3000) to avoid conflicts.
- Adjust the architecture when pushing the application to the cloud.


## Setting up the containers on the cloud VM

For setting up the containers on the cloud VM, please refer to the [OpenStack README](open-stack/README.md).
