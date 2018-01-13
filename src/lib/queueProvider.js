import amqp from 'amqplib/callback_api';

import config from '../../config.json';

class rabbitMqProvider { 
  initialise(q) {
    var that = this;
    that.queueName = q;

    return new Promise((resolve, reject) => {
      amqp.connect(config.queue.uri, function(err, conn) {
        if (err) { reject(err); return; }

        conn.createChannel(function(err, ch) {
          if (err) { reject(err); return; }

          ch.prefetch(100);
          ch.assertQueue(that.queueName, { durable: true });

          that.channel = ch;
          resolve(ch);
        });

      });
    });
  }

  publish(msg) {
    this.channel.sendToQueue(this.queueName, new Buffer(JSON.stringify(msg)), { persistent: true });
  }

  subscribe(func) {
    this.channel.consume(
      this.queueName, 
      async (msg) => {
        try {
          const result = await func(JSON.parse(msg.content.toString()));

          if (result === true) {
            this.channel.ack(msg);
          }
          else {
            this.channel.nack(msg);
          }
        }
        catch(e) {
          console.log(e);
          this.channel.nack(msg);
        }
      }, 
      { noAck: false }
    );
  }
}

export default new rabbitMqProvider();