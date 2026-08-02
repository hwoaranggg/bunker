process.env.PORT ||= '3220';
process.env.GAME_TIME_SCALE ||= '0.01';
await import('./demo-with-mongo.js');
