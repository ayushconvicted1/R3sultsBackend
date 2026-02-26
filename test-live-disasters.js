const { getLiveDisasters } = require('./src/controllers/liveDisasterController');
(async () => {
  await getLiveDisasters({}, { json: (data) => console.log(JSON.stringify(data, null, 2)) }, () => {});
})();
