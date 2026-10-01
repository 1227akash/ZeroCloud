const http = require('http');
const next = require('next');
const { SignalingService } = require('./server/signaling');

if (!process.env.NODE_ENV && process.argv.includes('--production')) {
  process.env.NODE_ENV = 'production';
}
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const signaling = new SignalingService();
  signaling.init(server);

  server.listen(port, () => {
    console.log(`> ZeroCloud ready on http://localhost:${port}`);
    console.log(`> Signaling service active at ws://localhost:${port}/ws`);
  });
});
