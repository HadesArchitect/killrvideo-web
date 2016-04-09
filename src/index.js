import express from 'express';
import { createServer } from 'http';
import { dataSourceRoute } from 'falcor-express';
import bodyParser from 'body-parser';
import SocketIO from 'socket.io';
import morgan from 'morgan';

import { logErrors } from './middleware/log-errors';
import { handleErrors } from './middleware/handle-errors';
import { session } from './middleware/session';
import KillrVideoRouter from './router';
import { handleConnection } from './chat-handler';
import RequestContext from './request-context';
import config from 'config';
import { logger } from './utils/logging';

// Create the server
const app = express();

// Serve up static build assets
app.use('/static', express.static(`${__dirname}/resources/static`));

// Request logging when in development
if (app.get('env') === 'development') {
  app.use(morgan('dev'));
}

// Falcor requests to model.json
app.use('/model.json', [
  // Parse POST body for requests to falcor endpoint
  bodyParser.urlencoded({ extended: false }),
  // Session storage
  session(),
  // Dispatch to Falcor router
  dataSourceRoute((req, res) => new KillrVideoRouter(new RequestContext(req, res)))
]);

// All other requests serve up the server.html page 
app.get('/*', (req, res) => {
  res.sendFile(`${__dirname}/resources/static/server.html`);
});

// Error handlers
app.use(logErrors());
app.use(handleErrors());

// Create the server
const server = createServer(app);

// Attach some logging to start/stop
server.on('listening', () => {
  logger.log('info', 'KillrVideo Web Server listening on %j', server.address());
});
server.on('close', () => {
  logger.log('info', 'KillrVideo Web Server is closed');
});

// Listen for websocket connections
const io = SocketIO(server);
io.on('connection', handleConnection);

// Start the server
const { host, port } = config.get('web.server');
server.listen(port, host);