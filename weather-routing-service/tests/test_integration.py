import json
import pika
import threading
import unittest
from time import sleep
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import start_weather_routing_service
from dotenv import load_dotenv

# Get the base directory of the tests
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables based on the environment
if os.environ.get('ENVIRONMENT') == 'development':
    load_dotenv(os.path.join(base_dir, '.env.development'))

class TestWeatherRoutingServiceIntegration(unittest.TestCase):
    REQUESTS_QUEUE = 'weather_routing_requests'
    RESULTS_QUEUE = 'weather_routing_results'    

    @classmethod
    def setUpClass(cls):
        # Start the main.py script in a separate thread
        cls.main_thread = threading.Thread(target=start_weather_routing_service)
        cls.main_thread.start()
        # Wait for a short time to allow the main.py script to start up
        sleep(5)  # Adjust the delay as needed

    @classmethod
    def tearDownClass(cls):
        # Stop the main.py script after running the tests
        # (You'll need to implement a way to gracefully stop the script)
        # ...
        cls.main_thread.join()
            

    def setUp(self):
        # Set up RabbitMQ connection
        self.rabbitmq_url = os.environ['RABBITMQ_URL']
        self.connection = pika.BlockingConnection(pika.URLParameters(self.rabbitmq_url))
        self.channel = self.connection.channel()

        # Declare queues
        self.channel.queue_declare(queue=TestWeatherRoutingServiceIntegration.REQUESTS_QUEUE)
        self.channel.queue_declare(queue=TestWeatherRoutingServiceIntegration.RESULTS_QUEUE)

        # To capture results
        self.received_messages = []

    def on_response(self, ch, method, properties, body):
        print(f"Received message: {body}")
        self.received_messages.append(json.loads(body))
        ch.basic_ack(delivery_tag=method.delivery_tag)

    def test_send_and_receive_routing_request(self):
        # Prepare test data
        test_routing_data = {
            'boat': {'id': '663e0e55310d61bd38478342' },
            # Add other necessary data for routing
        }

        # Start consuming on the routing_results queue
        self.channel.basic_consume(queue=TestWeatherRoutingServiceIntegration.RESULTS_QUEUE, on_message_callback=self.on_response, auto_ack=False)

        # Send routing request
        self.channel.basic_publish(exchange='', routing_key=TestWeatherRoutingServiceIntegration.REQUESTS_QUEUE, body=json.dumps(test_routing_data))

        # Start a non-blocking consume session
        self.connection.process_data_events(time_limit=10)  # Adjust time limit as needed

        # Check if response is received
        self.assertTrue(len(self.received_messages) > 0, "No routing result received.")
        print(f"Received routing result: {self.received_messages[0]}")

    def tearDown(self):
        self.channel.close()
        self.connection.close()

if __name__ == '__main__':
    unittest.main()