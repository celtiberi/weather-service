const jackrabbit = require('@pager/jackrabbit');


function getPF2(user)
{
    console.log('client starting')
    const rabbit = jackrabbit(`amqp://${user}:${user}@rabbitmq:5672`);
    const exchange = rabbit.default();
    const rpc = exchange.queue({ name: 'rpc_point_forecast_queue' });

    const onReply = (data) => {
        console.log('result:', JSON.stringify(data));
        console.log('error:', data.error);
    }

    rpc.on('ready', () => {            
        exchange.publish({ lat: 14.350, lon: -77.476 }, {
            key: 'rpc_point_forecast_queue',
            reply: onReply    // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance
        });
    });

    rpc.on('error', (err) => {
        console.log('error:', err);
    })
}





