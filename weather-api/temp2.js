const amqp = require('amqplib/callback_api');

function publisher() {
    return amqp.connect('amqp://guest:guest@localhost:5672', (error0, connection) => {
        if (error0) {
            throw error0;
        }
        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1;
            }
            const queue = 'hello';
            const msg = 'Hello world';
        
            channel.assertQueue(queue, {
                durable: false
            });
        
            channel.sendToQueue(queue, Buffer.from(msg));
            console.log(" [x] Sent %s", msg);
        });
    });
}

function subscriber() {
    return amqp.connect('amqp://guest:guest@localhost:5672', (error0, connection) => {
        if (error0) {
            throw error0;
        }
        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1;
            }
            const queue = 'hello';

            channel.assertQueue(queue, {
                durable: false
            });

            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);

            channel.consume(queue, function(msg) {
                console.log(" [x] Received %s", msg.content.toString());
            }, {
                noAck: true
            });
        });
    });
}

if (require.main === module) {
    // Code to be executed when the file is run directly
    const pub = publisher();
    const sub = subscriber();

    setTimeout(function() {
        // pub.close();
        // sub.close()
        process.exit(0)
        }, 500);
}
