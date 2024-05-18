import os
import pika
import pymongo
import requests
import json

import logging
# from logstash_async.handler import AsynchronousLogstashHandler
import sys
from dotenv import load_dotenv

from weatherrouting import Routing, Polar
from weatherrouting.routers.linearbestisorouter import LinearBestIsoRouter
from datetime import datetime

# Load environment variables from the specified .env file

# Get the base directory of the script
base_dir = os.path.dirname(os.path.abspath(__file__))

# Load environment variables based on the environment
if os.environ.get('ENVIRONMENT') == 'development':
    load_dotenv(os.path.join(base_dir, '.env.development'))

# RabbitMQ connection settings
rabbitmq_url = os.environ['RABBITMQ_URL']
connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
channel = connection.channel()

# MongoDB connection settings
mongodb_uri = os.environ['MONGODB_URI']
client = pymongo.MongoClient(mongodb_uri)
db = client['weather_routing']
boats_collection = db['boats']

# Logstash settings
logstash_host = os.environ['LOGSTASH_HOST']
logstash_port = int(os.environ['LOGSTASH_PORT'])

logger = logging.getLogger('python-logger')
logger.setLevel(logging.INFO)

# TODO elk stack isnt working locally right now. Get rid of this when it is fixed
# if logstash_host:
#     http_handler = AsynchronousLogstashHandler(
#         logstash_host, logstash_port, database_path='logstash.db')
#     logger.addHandler(http_handler)

stdout_handler = logging.StreamHandler(sys.stdout) 
logger.addHandler(stdout_handler)

REQUESTS_QUEUE = 'weather_routing_requests'
RESULTS_QUEUE = 'weather_routing_results'    

def get_boat_info(boat_id):
    boat = boats_collection.find_one({'_id': boat_id})
    return boat

def send_routing_request(routing_data):
    # Send routing request to RabbitMQ queue
    channel.queue_declare(queue='routing_requests')
    channel.basic_publish(exchange='', routing_key='routing_requests', body=json.dumps(routing_data))


def process_routing_request(ch, method, properties, body):
    # Process routing request received from RabbitMQ queue
    routing_request = json.loads(body)
    # Perform necessary actions with the routing request
    logger.info(f"Received routing request: {routing_request}")

    # Generate routing result based on the request
    routing_result = {
        'status': 'success',
        'data': {
            'route': 'Calculated optimal route based on weather conditions',
            'estimated_time': '4 hours'
        }
    }
    
    # Send the routing result back to the results queue
    channel.basic_publish(exchange='', routing_key=RESULTS_QUEUE, body=json.dumps(routing_result))
    logger.info(f"Sent routing result: {routing_result}")

    # Acknowledge the message
    ch.basic_ack(delivery_tag=method.delivery_tag)


def start_weather_routing_service():
    try:
        # Example usage
        boat_id = 'boat123'
        boat_info = get_boat_info(boat_id)
        logger.info("test")
        # logger.info(f"Retrieved boat information for boat ID: {boat_id}")

        logger.info("Weather Routing Service is running. Waiting for routing requests...")
        channel.basic_consume(queue=REQUESTS_QUEUE, on_message_callback=process_routing_request, auto_ack=True)
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("Weather Routing Service is stopping...")
    finally:
        connection.close()
        client.close()

if __name__ == '__main__':
    start_weather_routing_service()